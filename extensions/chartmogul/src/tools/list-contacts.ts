import { ContactsResponse, listContacts } from "../api";

type Input = {
  /**
   * The cursor to use for pagination.
   */
  cursor?: string;
  /**
   * The number of contacts to return per page.
   */
  per_page?: number;
  /**
   * Filter contacts by customer UUID. This can be obtained by using the list-customers or search-customers-by-email tool.
   */
  customer_uuid?: string;
  /**
   * Filter contacts by data source UUID. If you don't have the UUID, you can lookup a data source using the list-data-sources tool.
   */
  data_source_uuid?: string;
};

/**
 * List contacts in ChartMogul by customer and data source.
 * @param {Input} param0
 * @returns {Promise<ContactsResponse>}
 */
export default async function ({
  cursor,
  per_page,
  customer_uuid,
  data_source_uuid,
}: Input): Promise<ContactsResponse> {
  const res = await listContacts({ cursor, per_page, customer_uuid, data_source_uuid });

  if (!res.ok) {
    throw new Error(`Failed to list contacts (${res.status})`);
  }

  return res.json();
}
