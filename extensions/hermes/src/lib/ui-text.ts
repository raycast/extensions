/** Text helpers used by list rows and compact selectors. */

const graphemeSegmenter =
  typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : undefined;

function graphemes(value: string): string[] {
  // Segmenter keeps emoji joined by ZWJ and combining marks together. The fallback still
  // keeps surrogate pairs intact on runtimes that do not expose the newer API.
  return graphemeSegmenter === undefined
    ? Array.from(value)
    : Array.from(graphemeSegmenter.segment(value), (part) => part.segment);
}

/** Normalize whitespace and shorten a label without splitting a Unicode code point. */
export function truncateOneLine(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (maxLength <= 0) return "";

  const units = graphemes(normalized);
  if (units.length <= maxLength) return normalized;

  // Reserve two display units for a readable truncation marker. This keeps the
  // compact rows comfortably inside their intended width, including emoji.
  const visibleLength = Math.max(0, maxLength - 2);
  return `${units.slice(0, visibleLength).join("").trimEnd()}…`;
}

export function compactMessageCount(count: number): string {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  return `${safeCount} ${safeCount === 1 ? "msg" : "msgs"}`;
}

/** Distinguish a section of conversations from the message count shown on each row. */
export function compactConversationCount(count: number): string {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  return `${safeCount} ${safeCount === 1 ? "conversation" : "conversations"}`;
}

/** Keep provider/model accessories readable in compact Raycast rows. */
export function compactModelLabel(model: string, maxLength = 25): string {
  return truncateOneLine(model, maxLength);
}

export function conversationDropdownLabel(title: string, relativeDate: string): string {
  const date = relativeDate.replace(/\s+/gu, " ").trim();
  if (date === "") return truncateOneLine(title, 56);

  const suffix = ` · ${date}`;
  const titleBudget = Math.max(1, 56 - Array.from(suffix).length);
  return `${truncateOneLine(title, titleBudget)}${suffix}`;
}
