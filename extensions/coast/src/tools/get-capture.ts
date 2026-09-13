import { getCapture } from "../coast";
import { captureEvidence } from "../evidence";
import { pageText } from "../pagination";
import type { CaptureTextPage } from "../tool-contracts";

type Input = {
  /**
   * Frame ID from another Coast tool result.
   */
  frameId: number;
  /** Zero-based OCR character offset returned by a previous page. */
  offset?: number;
  /** Maximum OCR characters in this page. Defaults to 20000 and is capped at 50000. */
  maxCharacters?: number;
};

/**
 * Retrieve full metadata and OCR text for one Coast frame. Use after search or timeline tools when the complete captured text is needed.
 */
export default async function tool(input: Input): Promise<CaptureTextPage> {
  const capture = await getCapture(input.frameId);
  const evidence = captureEvidence(capture, Number.MAX_SAFE_INTEGER);
  const page = pageText(capture.ocr_text, input);
  const partialPage = page.pagination.offset > 0 || page.pagination.has_more;
  return {
    ...evidence,
    ocr_text: page.text,
    ocr_truncated: partialPage,
    ocr_pagination: page.pagination,
    next_character_offset: page.pagination.next_offset,
    ocr_completeness: partialPage ? "partial-page" : "complete-payload",
    warnings: [
      ...evidence.warnings,
      ...(partialPage
        ? [
            "Only one OCR text page is returned. Continue with next_character_offset until has_more is false; page exhaustion does not prove OCR recognized all visible content.",
          ]
        : []),
    ],
  };
}
