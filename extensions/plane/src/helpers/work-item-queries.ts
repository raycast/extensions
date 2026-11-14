import { toPlaneDate } from "./dates";

/**
 * Query builders for the two filtered work item lists.
 *
 * - v2 (developers.plane.so/api-reference/v2/filtering-and-ordering): exact `name=value`, or `name__in=a,b` for
 *   several values; date ranges as `name__gte` / `name__lte` with plain `YYYY-MM-DD` dates; no `me` alias.
 * - Custom v1 filters (patched Community Edition): comma = OR within a param, no `__in`; `me` and `None`
 *   are accepted for user params; dates as `YYYY-MM-DD;after` / `YYYY-MM-DD;before`, comma for a range.
 *   Only params the server lists in `X-Plane-Work-Item-Filter-Params` are sent.
 */

export type StateGroupFilter = "backlog" | "unstarted" | "started" | "completed" | "cancelled";
export type PriorityFilter = "urgent" | "high" | "medium" | "low" | "none";

export const OPEN_STATE_GROUPS: StateGroupFilter[] = ["backlog", "unstarted", "started"];
export const CLOSED_STATE_GROUPS: StateGroupFilter[] = ["completed", "cancelled"];

/** Inclusive bounds. A `Date` is a day picked in the user's time zone; a string must be `YYYY-MM-DD`. */
export type DateRange = { after?: Date | string; before?: Date | string };

export type QueryParams = Record<string, string | number | undefined>;

/** `YYYY-MM-DD` for a calendar date, keeping the day the user picked (see `toPlaneDate`). */
export function toPlaneDateParam(value: Date | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : undefined;
  return toPlaneDate(value)?.toISOString().slice(0, 10);
}

function joinList(values: readonly string[] | undefined): string | undefined {
  const list = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return list.length > 0 ? [...new Set(list)].join(",") : undefined;
}

// ---------------------------------------------------------------------------------------------
// Custom v1 filters
// ---------------------------------------------------------------------------------------------

export type CustomWorkItemFilters = {
  /** User ids, `me`, or `None` (has no assignee). */
  assignees?: string[];
  createdBy?: string[];
  mentions?: string[];
  subscriber?: string[];
  state?: string[];
  stateGroups?: StateGroupFilter[];
  priorities?: PriorityFilter[];
  labels?: string[];
  cycle?: string[];
  module?: string[];
  startDate?: DateRange;
  targetDate?: DateRange;
  updatedAt?: DateRange;
};

export type ListOptions = {
  perPage?: number;
  cursor?: string;
  orderBy?: string;
  fields?: string;
  expand?: string;
};

/** `2026-10-01;after,2026-10-31;before`, or undefined when neither bound is valid. */
export function toCustomDateRange(range: DateRange | undefined): string | undefined {
  if (!range) return undefined;
  const after = toPlaneDateParam(range.after);
  const before = toPlaneDateParam(range.before);
  const parts = [after ? `${after};after` : undefined, before ? `${before};before` : undefined].filter(Boolean);
  return parts.length > 0 ? parts.join(",") : undefined;
}

/** Builds the query for `GET /api/v1/workspaces/{slug}/work-items/`, dropping filters the server didn't advertise. */
export function buildCustomWorkItemQuery(
  filters: CustomWorkItemFilters,
  advertisedParams: readonly string[],
  options: ListOptions = {},
): QueryParams {
  const advertised = new Set(advertisedParams.map((name) => name.toLowerCase()));
  const candidates: QueryParams = {
    assignees: joinList(filters.assignees),
    created_by: joinList(filters.createdBy),
    mentions: joinList(filters.mentions),
    subscriber: joinList(filters.subscriber),
    state: joinList(filters.state),
    state_group: joinList(filters.stateGroups),
    priority: joinList(filters.priorities),
    labels: joinList(filters.labels),
    cycle: joinList(filters.cycle),
    module: joinList(filters.module),
    start_date: toCustomDateRange(filters.startDate),
    target_date: toCustomDateRange(filters.targetDate),
    updated_at: toCustomDateRange(filters.updatedAt),
  };

  const query: QueryParams = {};
  for (const [name, value] of Object.entries(candidates)) {
    if (value !== undefined && advertised.has(name)) query[name] = value;
  }
  return {
    ...query,
    per_page: options.perPage,
    cursor: options.cursor,
    order_by: options.orderBy,
    fields: options.fields,
    expand: options.expand,
  };
}

// ---------------------------------------------------------------------------------------------
// Plane API v2
// ---------------------------------------------------------------------------------------------

export type V2WorkItemFilters = {
  assigneeIds?: string[];
  stateGroups?: StateGroupFilter[];
  priorities?: PriorityFilter[];
  labelIds?: string[];
  projectIds?: string[];
  startDate?: DateRange;
  targetDate?: DateRange;
};

export type V2ListOptions = ListOptions & {
  /** `cursor` opts into keyset pagination (`order_by` must then be created_at, updated_at, sequence_id or id). */
  paginate?: "cursor";
  offset?: number;
};

/** One value → `name=value`; several → `name__in=a,b`. */
function exactOrIn(query: QueryParams, name: string, values: readonly string[] | undefined) {
  const list = joinList(values)?.split(",") ?? [];
  if (list.length === 1) query[name] = list[0];
  else if (list.length > 1) query[`${name}__in`] = list.join(",");
}

/** Builds the query for `GET /api/v2/workspaces/{slug}/work-items/`. */
export function buildV2WorkItemQuery(filters: V2WorkItemFilters, options: V2ListOptions = {}): QueryParams {
  const query: QueryParams = {};
  exactOrIn(query, "assignee_id", filters.assigneeIds);
  exactOrIn(query, "state_group", filters.stateGroups);
  exactOrIn(query, "priority", filters.priorities);
  exactOrIn(query, "label_id", filters.labelIds);
  exactOrIn(query, "project_id", filters.projectIds);
  query.start_date__gte = toPlaneDateParam(filters.startDate?.after);
  query.start_date__lte = toPlaneDateParam(filters.startDate?.before);
  query.target_date__gte = toPlaneDateParam(filters.targetDate?.after);
  query.target_date__lte = toPlaneDateParam(filters.targetDate?.before);
  return {
    ...query,
    per_page: options.perPage,
    // `cursor` alone keeps a follow-up request on the cursor path; `paginate` is only needed on the first page.
    paginate: options.cursor ? undefined : options.paginate,
    cursor: options.cursor,
    offset: options.offset,
    order_by: options.orderBy,
    fields: options.fields,
    expand: options.expand,
  };
}

/** v2 list envelope (developers.plane.so/api-reference/v2/pagination). */
export type V2Envelope<T> = {
  data?: T[];
  pagination?: { style?: "offset" | "cursor" | string };
  next?: number | null;
  previous?: number | null;
  total_count?: number;
  next_cursor?: string | null;
  has_more?: boolean;
};

/** Where the next page starts, branching on `pagination.style` as the docs recommend. Undefined on the last page. */
export function nextV2Page(envelope: V2Envelope<unknown>): { cursor: string } | { offset: number } | undefined {
  if (envelope.pagination?.style === "cursor") {
    return envelope.has_more && envelope.next_cursor ? { cursor: envelope.next_cursor } : undefined;
  }
  return typeof envelope.next === "number" ? { offset: envelope.next } : undefined;
}
