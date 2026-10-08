import type { Tool } from "@raycast/api";
import { grabCurrentScreen } from "../coast";
import { timestampEvidence } from "../evidence";
import type { CurrentScreen } from "../tool-contracts";

type Input = {
  /**
   * Run OCR on the new screenshot and include visible text.
   */
  includeOcr?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: input.includeOcr
    ? "Capture the current screen and send its metadata and OCR text to Raycast AI?"
    : "Capture the current screen and send its metadata to Raycast AI?",
});

/**
 * Capture the current display through Coast. Only use when the user explicitly asks about what is on screen right now. Coast recording exclusions still apply.
 */
export default async function tool(input: Input): Promise<CurrentScreen> {
  const result = await grabCurrentScreen(input.includeOcr);
  const ocrCharacters = [...(result.ocr_text || "")];
  const excerptCharacters = ocrCharacters.slice(0, 10_000);
  const remainingCharacters = ocrCharacters.slice(10_000);
  return {
    ...result,
    url: result.url ?? undefined,
    ...timestampEvidence(result.timestamp),
    ocr_text: excerptCharacters.join(""),
    ocr_truncated: remainingCharacters.length > 0,
    ocr_text_tail: remainingCharacters.join(""),
    ocr_text_tail_offset: remainingCharacters.length > 0 ? 10_000 : undefined,
    ocr_offset_unit: "unicode-code-point",
    ocr_payload_complete: true,
    ocr_character_count: ocrCharacters.length,
    warnings: [
      ...(result.warnings || []),
      ...(input.includeOcr
        ? [
            "OCR can contain recognition errors or overlays. For a large one-off capture, ocr_text_tail contains every character after ocr_text; recapturing would not provide stable pagination.",
          ]
        : []),
      "An image path is a local artifact reference, not inspected image content.",
    ],
  };
}
