import { CallLogsResponse, listCallLogs } from "../api";

type Input = {
  /**
   * The cursor to use for pagination.
   */
  cursor?: string;
  /**
   * The number of call logs and notes to return per page.
   */
  per_page?: number;
  /**
   * Filter by author email address.
   */
  author?: string;
  /**
   * Filter by contact UUID. This can be obtained by using the list-contacts tool.
   */
  contact_uuid?: string;
  /**
   * Filter by customer UUID. This can be obtained by using the list-customers or search-customers-by-email tool.
   */
  customer_uuid?: string;
  /**
   * Filter entries created after this date (ISO 8601 format).
   */
  created_after?: string;
  /**
   * Filter entries created before this date (ISO 8601 format).
   */
  created_before?: string;
  /**
   * Filter entries updated after this date (ISO 8601 format).
   */
  updated_after?: string;
  /**
   * Filter entries updated before this date (ISO 8601 format).
   */
  updated_before?: string;
  /**
   * Filter to show only call logs when true, or exclude call logs when false.
   */
  call_log?: boolean;
  /**
   * Filter to show only notes when true, or exclude notes when false.
   */
  note?: boolean;
};

/**
 * List call logs and notes in ChartMogul by author, customer, contact, dates, and type.
 * @param {Input} options
 * @returns {Promise<CallLogsResponse>}
 */
export default async function ({
  cursor,
  per_page,
  author,
  contact_uuid,
  customer_uuid,
  created_after,
  created_before,
  updated_after,
  updated_before,
  call_log,
  note,
}: Input): Promise<CallLogsResponse> {
  const res = await listCallLogs({
    cursor,
    per_page,
    author,
    contact_uuid,
    customer_uuid,
    created_after,
    created_before,
    updated_after,
    updated_before,
    call_log,
    note,
  });

  if (!res.ok) {
    throw new Error(`Failed to list call logs and notes (${res.status})`);
  }

  return res.json();
}
