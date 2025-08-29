import { listCustomerActivities } from "../api";

type Input = {
  /**
   * The customer UUID of the customer, this can be obtained by using the list-customers or search-customers-by-email tool.
   */
  customer_uuid: string;
  /**
   * The cursor to use for pagination.
   */
  cursor?: string;
  /**
   * The number of activities to return per page.
   */
  per_page?: number;
};

/**
 * List activities for a customer in ChartMogul. UUID is Required.
 * @param {Input} options
 * @returns {Promise<ActivitiesResponse>}
 */
export default async function ({ customer_uuid, cursor, per_page }: Input) {
  const res = await listCustomerActivities({ customer_uuid, cursor, per_page });

  if (!res.ok) {
    throw new Error(`Failed to list customer activities (${res.status})`);
  }

  return res.json();
}
