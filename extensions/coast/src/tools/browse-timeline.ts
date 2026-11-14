import { timelineCover } from "../coast";
import { captureEvidence } from "../evidence";
import { pageItems } from "../pagination";

type Input = {
  /**
   * Required short datetime range, recommended no longer than 30 minutes, such as 2026-09-09T14:00|2026-09-09T14:30.
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
   * Minimum textual difference from recently selected frames, from 0 to 1. Defaults to 0.2.
   */
  minimumTextDifference?: number;
  /**
   * Minimum seconds between selected frames. Defaults to 10.
   */
  minimumSeconds?: number;
  /**
   * Maximum frames in this page. Defaults to 30 and is capped at 200.
   */
  limit?: number;
  /** Zero-based selected-frame offset returned by a previous page. */
  offset?: number;
};

/**
 * Build a chronological, deduplicated Coast timeline for a short period. Use for "walk me through this half hour" or moment-by-moment reconstruction.
 */
export default async function tool(input: Input) {
  const result = await timelineCover(input);
  const page = pageItems(result.frames, input, 30);
  return {
    total_frame_count: result.total_count,
    selected_frame_count: result.selected_count,
    returned_frame_count: page.items.length,
    truncated: page.pagination.has_more,
    frames: page.items.map((capture) => captureEvidence(capture)),
    pagination: page.pagination,
    coverage:
      "Pagination exhausts the textually deduplicated selected frames for this requested timeline, not every recorded frame. total_frame_count is the source-reported frame count before selection.",
  };
}
