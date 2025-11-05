import { CustomersResponse, listCustomers } from "../api";

type Input = {
  /**
   * The data source UUID of the customer, this can be obtained by using the list-data-sources tool.
   */
  data_source_uuid?: string;
  /**
   * The status of the customer
   */
  status?: "New_Lead" | "Working_Lead" | "Qualified_Lead" | "Unqualified_Lead" | "Active" | "Past_Due" | "Cancelled";
  /**
   * The cursor to use for pagination.
   */
  cursor?: string;
  /**
   * The number of customers to return per page.
   */
  per_page?: number;
};

/**
 * List customers in ChartMogul by data source, status, and more.
 * @param {Input} param0
 * @returns {Promise<CustomersResponse>}
 */
export default async function ({ data_source_uuid, status, cursor, per_page }: Input): Promise<CustomersResponse> {
  const res = await listCustomers({ data_source_uuid, status, cursor, per_page });

  if (!res.ok) {
    throw new Error(`Failed to list customers (${res.status})`);
  }

  return res.json();
}
