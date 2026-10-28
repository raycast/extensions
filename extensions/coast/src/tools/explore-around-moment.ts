import { getCapture, timelineCover } from "../coast";
import { aroundMoment } from "../dates";
import { groupMoments } from "../moments";
import { captureEvidence } from "../evidence";
import { pageItems } from "../pagination";

type Input = {
  /** Frame ID returned by search or timeline tools. */
  frameId: number;
  /** Minutes before and after the frame. Defaults to 5, maximum 15. */
  minutes?: number;
  /** Maximum representative captures in this page. Defaults to 50 and is capped at 200. */
  limit?: number;
  /** Zero-based selected-frame offset returned by a previous page. */
  offset?: number;
};

/** Explore what happened before and after a known moment. Returns grouped representative captures, preserving frame IDs for inspection. */
export default async function tool(input: Input) {
  const capture = await getCapture(input.frameId);
  const minutes = Number.isFinite(input.minutes)
    ? Math.max(1, Math.min(15, input.minutes!))
    : 5;
  const tr = aroundMoment(capture.timestamp, minutes);
  const result = await timelineCover({ tr, minimumSeconds: 15 });
  const page = pageItems(result.frames, input);
  return {
    tr,
    selected_count: result.frames.length,
    returned_count: page.items.length,
    truncated: page.pagination.has_more,
    groups: groupMoments(page.items).map((frames) => ({
      start: frames[0].timestamp,
      end: frames.at(-1)!.timestamp,
      selected_count: frames.length,
      frames: frames.map((frame) => captureEvidence(frame, 500)),
    })),
    pagination: page.pagination,
    coverage:
      "Pagination covers representative frames selected from the bounded surrounding window, not every recorded frame. A group can continue across a page boundary.",
  };
}
