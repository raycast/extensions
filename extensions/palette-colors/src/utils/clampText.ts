/**
 * Shortens AI-generated text to a field's character limit. Models don't count
 * characters reliably, so the limit in the prompt is only a hint. Cuts at the
 * last whole word that fits, falling back to a hard cut for one long word.
 */
export function clampText(text: string, maxLength: number): string {
  const cleaned = text.trim().replace(/^["'“”]+|["'“”]+$/g, "");
  if (cleaned.length <= maxLength) return cleaned;

  const cut = cleaned.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const shortened = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return shortened.replace(/[\s,;:.\-–—]+$/, "");
}
