import { getOcrBoxes } from "../coast";
import { timestampEvidence } from "../evidence";
import { pageItems } from "../pagination";
import type { OcrBoxPage } from "../tool-contracts";

type Input = {
  /**
   * Frame ID from another Coast tool result.
   */
  frameId: number;
  /**
   * Maximum OCR boxes in this page. Defaults to 50 and is capped at 200.
   */
  limit?: number;
  /** Zero-based OCR box offset returned by a previous page. */
  offset?: number;
};

/**
 * Retrieve positioned OCR text boxes for one Coast frame. Use when text location or approximate visual reading order matters.
 */
export default async function tool(input: Input): Promise<OcrBoxPage> {
  const result = await getOcrBoxes(input.frameId);
  const page = pageItems(result.boxes, input);
  return {
    ...result,
    domain: result.domain ?? undefined,
    url: result.url ?? undefined,
    ...timestampEvidence(result.timestamp),
    warnings: [
      ...(result.warnings || []),
      "OCR boxes can contain recognition errors or overlays.",
    ],
    total_box_count: result.boxes.length,
    returned_box_count: page.items.length,
    truncated: page.pagination.has_more,
    boxes: page.items,
    pagination: page.pagination,
    coverage:
      "Pagination covers all OCR boxes returned by Coast for this frame. It does not imply OCR recognized every visible element.",
  };
}
