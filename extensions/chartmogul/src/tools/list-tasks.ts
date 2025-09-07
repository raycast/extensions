import { listTasks, TasksResponse } from "../api";

type Input = {
  /**
   * The cursor to use for pagination.
   */
  cursor?: string;
  /**
   * The number of tasks to return per page.
   */
  per_page?: number;
  /**
   * Filter tasks by owner email.
   */
  owner?: string;
  /**
   * Filter tasks by customer UUID. Required. If not provided, ask the user to lookup a customer using the search-customers-by-email or list-customers tool.
   */
  customer_uuid: string;
  /**
   * Filter tasks by contact UUID. This can be obtained by using the list-contacts tool.
   */
  contact_uuid?: string;
  /**
   * Filter tasks by opportunity UUID. This can be obtained by using the list-opportunities tool.
   */
  opportunity_uuid?: string;
  /**
   * Filter tasks by type.
   */
  type?: string;
  /**
   * Filter tasks by status.
   */
  status?: "pending" | "completed" | "cancelled";
  /**
   * Filter tasks with due date greater than or equal to this date (ISO 8601 format).
   */
  due_date_gte?: string;
  /**
   * Filter tasks with due date less than or equal to this date (ISO 8601 format).
   */
  due_date_lte?: string;
};

/**
 * List tasks in ChartMogul by owner, customer, contact, opportunity, type, status, and due date.
 * @param {Input} options
 * @returns {Promise<TasksResponse>}
 */
export default async function ({
  cursor,
  per_page,
  owner,
  customer_uuid,
  contact_uuid,
  opportunity_uuid,
  type,
  status,
  due_date_gte,
  due_date_lte,
}: Input): Promise<TasksResponse> {
  const res = await listTasks({
    cursor,
    per_page,
    owner,
    customer_uuid,
    contact_uuid,
    opportunity_uuid,
    type,
    status,
    due_date_gte,
    due_date_lte,
  });

  if (!res.ok) {
    throw new Error(`Failed to list tasks (${res.status})`);
  }

  return res.json();
}
