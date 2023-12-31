'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type State = {
  erros?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

const FormSchema = z.object({
  customerId: z.string({
    invalid_type_error: 'Please select a customer.'
  }),
  amount: z.coerce.number().gt(0,{message:'Please enter an amount greater than $0.'}),
  status: z.enum(['pending', 'paid'],{invalid_type_error:'Please select an invoice status.'}),
});

const CreateInvoice = FormSchema.omit({});
const UpdateInvoice = FormSchema.omit({});

export async function createInvoice(preState: State, formData: FormData) {
  const validateFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  console.log(`validateFields:${validateFields.success}`)

  if(!validateFields.success){
     return {
        errors: validateFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
     }
  }

  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  console.log(`customerId:${customerId} amount:${amount} status:${status}`);

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];
  try {
    await sql`
             INSERT INTO invoices (customer_id,amount,status,date)
             VALUES (${customerId},${amountInCents},${status}, ${date})
             `;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  console.log(`customerId:${customerId} amount:${amount} status:${status}`);

  const amountInCents = amount * 100;
  try {
    await sql`
     UPDATE invoices 
     set customer_id=${customerId},amount=${amountInCents},status=${status}
     where id = ${id}
    `;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Update Invoice.',
    };
  }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  throw new Error('Failed to Delete Invoice');

  try {
    await sql`DELETE FROM invoices where id = ${id}`;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Delete Invoice.',
    };
  }
  revalidatePath('/dashboard/invoices');
}
