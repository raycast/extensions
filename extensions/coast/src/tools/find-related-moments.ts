import { relatedMoments } from "../discovery";
import { captureEvidence } from "../evidence";
import type { RelatedCapture } from "../tool-contracts";
import type { PrefixPagination } from "../pagination";
type Output = {
  frame_id: number;
  tr: string;
  warning: string;
  candidate_count: number;
  truncated: boolean;
  pagination: PrefixPagination;
  matches: RelatedCapture[];
};
type Input = {
  /** A frame to use as the matching reference. */
  frameId: number;
  /** Explicit local date range, preferably no longer than 7 days. */
  tr: string;
  /** Match the URL, exact title in the same application, or representative application activity. */
  match: "url" | "title" | "application";
  /** Maximum candidate captures evaluated in this page. Defaults to 50 and is capped at 200. */
  limit?: number;
  /** Zero-based candidate offset returned by a previous page. */
  offset?: number;
};
/** Find related captures using explicit metadata, not semantic guesses. Each result explains its match; candidate search is not exhaustive. */
export default async function tool(input: Input): Promise<Output> {
  const result = await relatedMoments(input.frameId, input.tr, input.match, {
    offset: input.offset,
    limit: input.limit,
  });
  return {
    frame_id: input.frameId,
    tr: input.tr,
    warning: result.warning,
    candidate_count: result.candidate_count,
    truncated: result.pagination.has_more,
    pagination: result.pagination,
    matches: result.matches.map(({ capture, reason }) => ({
      ...captureEvidence(capture),
      match_reason: reason,
    })),
  };
}
