import {
  targetUsage,
  topApplications,
  topDomains,
  totalScreenTime,
} from "../coast";
import { pageFetchedPrefix, pageItems } from "../pagination";
import type { PrefixPagination } from "../pagination";

type UsageRow = {
  frame_count: number;
  recorded_seconds: number;
  recorded_seconds_human: string;
  start_ms?: number;
  end_ms?: number;
  identifier: string;
  display_name?: string;
};
type Output = {
  kind?: string;
  items?: UsageRow[];
  pagination?: PrefixPagination;
  coverage?: string;
  frame_count?: number;
  recorded_seconds?: number;
  recorded_seconds_human?: string;
  start_ms?: number;
  end_ms?: number;
  application?: string;
  domain?: string;
};

type Input = {
  /**
   * Date or datetime range. Examples: 2026-09-09, 2026-09-01|2026-09-09, since:2026-09-01. Resolve relative dates before calling.
   */
  tr: string;
  /**
   * Specific application name or bundle ID. Omit for a ranked breakdown.
   */
  application?: string;
  /**
   * Specific web domain or partial domain name. Omit for a ranked breakdown.
   */
  domain?: string;
  /**
   * Return a domain ranking instead of an application ranking.
   */
  byDomain?: boolean;
  /**
   * Return only total recorded screen time for the range.
   */
  totalOnly?: boolean;
  /**
   * Maximum ranked rows in this page. Defaults to 10 and is capped at 200.
   */
  limit?: number;
  /** Zero-based ranking offset returned by a previous page. */
  offset?: number;
};

/**
 * Get total, per-application, per-domain, or ranked screen-time usage over a date range. Use for "how much time?" and usage breakdown questions.
 */
export default async function tool(input: Input): Promise<Output> {
  if (input.application) {
    return targetUsage(input.application, "application", input.tr);
  }
  if (input.domain) {
    return targetUsage(input.domain, "domain", input.tr);
  }
  if (input.totalOnly) return totalScreenTime(input.tr);
  const { offset, limit } = pageItems([], input, 10).pagination;
  if (!Number.isSafeInteger(offset + limit + 1))
    throw new Error("The requested ranking offset is too large.");
  const prefix = input.byDomain
    ? await topDomains(input.tr, offset + limit + 1)
    : await topApplications(input.tr, offset + limit + 1);
  const page = pageFetchedPrefix(prefix, { offset, limit }, 10);
  return {
    kind: input.byDomain ? "domains" : "applications",
    items: page.items,
    pagination: page.pagination,
    coverage:
      "Ranked recorded Coast usage for this range. An omitted total_count means only the requested prefix was fetched; continue with next_offset until has_more is false.",
  };
}
