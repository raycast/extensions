import { CustomerSubscriptionsResponse, listCustomerSubscriptions } from "../api";

type Input = {
  /**
   * The UUID of the customer to list subscriptions for. This can be obtained by using the list-customers or search-customers-by-email tool.
   */
  customer_uuid: string;
  /**
   * The cursor to use for pagination.
   */
  cursor?: string;
  /**
   * The number of subscriptions to return per page.
   */
  per_page?: number;
};

/**
 * List customer subscriptions in ChartMogul for a specific customer.
 * @param {Input} options
 * @returns {Promise<CustomerSubscriptionsResponse>}
 */
export default async function ({ customer_uuid, cursor, per_page }: Input): Promise<CustomerSubscriptionsResponse> {
  const res = await listCustomerSubscriptions({ customer_uuid, cursor, per_page });

  if (!res.ok) {
    throw new Error(`Failed to list customer subscriptions (${res.status})`);
  }

  return res.json();
}
