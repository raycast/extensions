import { usageSessions, type UsageSession, type UsageSessions } from "../coast";
import { pageItems, type Pagination } from "../pagination";

type Input = {
  /**
   * Date or datetime range. Examples: 2026-09-09, 2026-09-01|2026-09-09, since:2026-09-01. Resolve relative dates before calling.
   */
  tr: string;
  /**
   * Application bundle IDs to include.
   */
  appFilters?: string[];
  /**
   * Web domains to include.
   */
  domainFilters?: string[];
  /**
   * Minimum inactivity gap separating sessions, in minutes. Use about 10 for a day or 300 for a week.
   */
  gapMinutes?: number;
  /** Maximum sessions in this page. Defaults to 50 and is capped at 200. */
  limit?: number;
  /** Zero-based session offset returned by a previous page. */
  offset?: number;
};

type NextInput = {
  tr: string;
  appFilters?: string[];
  domainFilters?: string[];
  gapMinutes?: number;
  limit: number;
  offset: number;
};

type Output = {
  session_count: number;
  total_duration_seconds: number;
  total_duration_seconds_human: string;
  sessions: UsageSession[];
  pagination: Pagination;
  next_input?: NextInput;
  coverage: string;
};

export function recentActivityPage(
  result: UsageSessions,
  input: Input,
): Output {
  const page = pageItems(result.sessions, input);
  return {
    session_count: result.session_count,
    total_duration_seconds: result.total_duration_seconds,
    total_duration_seconds_human: result.total_duration_seconds_human,
    sessions: page.items,
    pagination: page.pagination,
    next_input: page.pagination.has_more
      ? {
          tr: input.tr,
          appFilters: input.appFilters,
          domainFilters: input.domainFilters,
          gapMinutes: input.gapMinutes,
          limit: page.pagination.limit,
          offset: page.pagination.next_offset!,
        }
      : undefined,
    coverage:
      "Pagination covers every Coast session returned for this range and filter scope. session_count and duration fields remain full-source totals, not page totals.",
  };
}

/**
 * Detect chronological Coast recording sessions over a date range. Use to reconstruct schedules, work blocks, breaks, or daily rhythm.
 */
export default async function tool(input: Input): Promise<Output> {
  const result = await usageSessions(
    input.tr,
    input.appFilters,
    input.domainFilters,
    input.gapMinutes,
  );
  return recentActivityPage(result, input);
}
