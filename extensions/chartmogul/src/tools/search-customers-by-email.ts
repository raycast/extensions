import { CustomersResponse, searchCustomers } from "../api";

type Input = {
  /**
   * The email for the customer.
   */
  email: string;
};

/**
 * Search customers in ChartMogul by email. Email is Required. It is not a fuzzy match. It must be exact.
 * @param {Input} param0
 * @returns {Promise<CustomersResponse>}
 */
export default async function ({ email }: Input): Promise<CustomersResponse> {
  const res = await searchCustomers(email);

  if (!res.ok) {
    throw new Error(`Failed to search customers (${res.status})`);
  }

  return res.json();
}
