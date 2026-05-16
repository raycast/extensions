import { callMcpTool } from "../lib/mcp";
import { injectThreadUrls } from "../lib/user";
import { ListThreadsInput, validate } from "../lib/validation";

/**
 * List recent email threads with optional filters.
 *
 * Free-text search should use `query-email-and-calendar` instead. This tool
 * exposes the full structured filter set: senders, recipients, subject /
 * body keyword filters, labels, split (name or id), date range, and
 * flag-based filters (unread, starred, has-attachment).
 */
type Input = {
  /** Max threads to return (1–50). */
  limit?: number;
  /** Pagination cursor returned by a previous call. */
  cursor?: string;
  /** Filter by sender email addresses. */
  from?: string[];
  /** Filter by recipient email addresses. */
  to?: string[];
  /** Subject substring filter. */
  subjectContains?: string;
  /** Body substring filter. */
  bodyContains?: string;
  /** Filter by one or more label names. */
  labels?: string[];
  /** Deprecated: single-label alias for `labels`. */
  label?: string;
  /** Split name or id (e.g. "Important", "VIP"). */
  split?: string;
  /** Start of the date range (RFC3339). */
  startDate?: string;
  /** End of the date range (RFC3339). */
  endDate?: string;
  /** Only unread threads. */
  isUnread?: boolean;
  /** Only starred threads. */
  isStarred?: boolean;
  /** Only threads that contain attachments. */
  hasAttachment?: boolean;
};

export default async function tool(input: Input): Promise<unknown> {
  const parsed = validate(ListThreadsInput, input);
  const args: Record<string, unknown> = {};
  if (parsed.limit !== undefined) args.limit = parsed.limit;
  if (parsed.cursor) args.cursor = parsed.cursor;
  if (parsed.from?.length) args.from = parsed.from;
  if (parsed.to?.length) args.to = parsed.to;
  if (parsed.subjectContains) args.subject_contains = parsed.subjectContains;
  if (parsed.bodyContains) args.body_contains = parsed.bodyContains;
  const labels = parsed.labels?.length ? parsed.labels : parsed.label ? [parsed.label] : undefined;
  if (labels?.length) args.labels = labels;
  if (parsed.split) args.split = parsed.split;
  if (parsed.startDate) args.start_date = parsed.startDate;
  if (parsed.endDate) args.end_date = parsed.endDate;
  if (parsed.isUnread !== undefined) args.is_unread = parsed.isUnread;
  if (parsed.isStarred !== undefined) args.is_starred = parsed.isStarred;
  if (parsed.hasAttachment !== undefined) args.has_attachment = parsed.hasAttachment;
  const result = await callMcpTool("list_threads", args);
  return injectThreadUrls(result);
}
