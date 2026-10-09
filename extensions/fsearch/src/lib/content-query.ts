/** Filters that narrow which files are read. Everything else is the text to find. */
const FILTER = /^!?(ext|type|kind|in|size|mtime|modified|re|path|limit):\S/;

/**
 * Splits `useEffect ext:tsx in:~/Developer` into the pattern (`useEffect`)
 * and the file query (`ext:tsx in:~/Developer`). The pattern keeps its own
 * spacing, so `foo  bar` still looks for two spaces.
 */
export function splitContentQuery(text: string): { pattern: string; q: string } {
  // Words and the whitespace between them, alternating; nothing is collapsed.
  const parts = text.split(/(\s+)/);
  const q: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (!FILTER.test(parts[i])) continue;
    q.push(parts[i]);
    // Drop the filter and the whitespace after it, so `foo ext:rs bar` leaves `foo bar`.
    parts[i] = "";
    if (i + 1 < parts.length) parts[i + 1] = "";
  }
  return { pattern: parts.join("").trim(), q: q.join(" ") };
}
