import { sampleActivity } from "../coast";
import { captureEvidence } from "../evidence";
import { pageItems } from "../pagination";

type Input = {
  /**
   * Required date or datetime range. Prefer about one hour. Examples: 2026-09-09T09:00|2026-09-09T10:00 or 2026-09-09.
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
   * Minimum frames for an activity segment to count. Defaults to 10.
   */
  minimumSegmentFrames?: number;
  /** Maximum segments in this page. Defaults to 50 and is capped at 200. */
  limit?: number;
  /** Zero-based segment offset returned by a previous page. */
  offset?: number;
};

/**
 * Return one representative Coast frame per activity segment. Use for a compact overview of an hour or day when exact moment-by-moment detail is unnecessary.
 */
export default async function tool(input: Input) {
  const segments = await sampleActivity(input);
  const page = pageItems(segments, input);
  return {
    segment_count: segments.length,
    truncated: page.pagination.has_more,
    segments: page.items.map((segment) => ({
      frame_count: segment.frame_count,
      duration: segment.duration,
      selected_frame: captureEvidence(segment.selected_frame),
    })),
    pagination: page.pagination,
    coverage:
      "One representative frame per Coast activity segment. Page exhaustion covers these sampled segments, not every recorded capture in the range.",
  };
}
