import { getAccessibilityTree } from "../coast";
import { accessibilityEvidence } from "../evidence";
import { pageText } from "../pagination";
import type { AccessibilityTextPage } from "../tool-contracts";

type Input = {
  /**
   * Frame ID from another Coast tool result.
   */
  frameId: number;
  /**
   * Render indented human-readable text instead of XML.
   */
  human?: boolean;
  /**
   * Keep only nodes carrying a title, description, or value. Recommended for content questions.
   */
  textOnly?: boolean;
  /**
   * Include hidden and off-screen nodes.
   */
  includeHidden?: boolean;
  /**
   * Include pixel coordinates and enabled or visible markers.
   */
  coordinates?: boolean;
  /**
   * Return the verbatim stored tree without simplification.
   */
  raw?: boolean;
  /**
   * Maximum tree depth.
   */
  maxDepth?: number;
  /**
   * Accessibility roles to include, such as AXButton, AXTextField, or AXLink.
   */
  roles?: string[];
  /**
   * Maximum characters of tree text returned. Defaults to 20000 and is capped at 50000.
   */
  maxCharacters?: number;
  /** Zero-based tree-text character offset returned by a previous page. */
  offset?: number;
};

/**
 * Retrieve the recorded macOS accessibility tree for a Coast frame. Use for UI labels, controls, structured visible content, and questions OCR cannot answer.
 */
export default async function tool(
  input: Input,
): Promise<AccessibilityTextPage> {
  const result = await getAccessibilityTree({
    frameId: input.frameId,
    human: input.human,
    textOnly: input.textOnly ?? true,
    includeHidden: input.includeHidden,
    coordinates: input.coordinates,
    raw: input.raw,
    maxDepth: input.maxDepth,
    roles: input.roles,
  });
  const evidence = accessibilityEvidence(result, Number.MAX_SAFE_INTEGER);
  const page = pageText(result.tree_text, input);
  const partialPage = page.pagination.offset > 0 || page.pagination.has_more;
  return {
    ...evidence,
    domain: result.domain ?? undefined,
    url: result.url ?? undefined,
    stored_bytes: result.stored_bytes ?? undefined,
    tree_text: page.text,
    has_payload: page.text.trim().length > 0,
    returned_bytes: Buffer.byteLength(page.text, "utf8"),
    returned_characters: [...page.text].length,
    truncated: page.pagination.has_more,
    text_page_partial: partialPage,
    text_pagination: page.pagination,
    next_character_offset: page.pagination.next_offset,
    completeness:
      evidence.completeness === "as-reported" && partialPage
        ? "partial"
        : evidence.completeness,
    warnings: [
      ...evidence.warnings,
      ...(partialPage
        ? [
            "Only one accessibility-text page is returned. Continue with next_character_offset until has_more is false; source tree partiality remains separate.",
          ]
        : []),
    ],
  };
}
