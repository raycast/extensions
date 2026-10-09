/** Filters that narrow which files are read. Everything else is the text to find. */
const FILTER = /^!?(ext|type|kind|in|size|mtime|modified|re|path|limit):\S/;

/**
 * Splits `useEffect ext:tsx in:~/Developer` into the pattern (`useEffect`)
 * and the file query (`ext:tsx in:~/Developer`).
 */
export function splitContentQuery(text: string): { pattern: string; q: string } {
  const pattern: string[] = [];
  const q: string[] = [];
  for (const token of text.trim().split(/\s+/)) {
    if (!token) continue;
    (FILTER.test(token) ? q : pattern).push(token);
  }
  return { pattern: pattern.join(" "), q: q.join(" ") };
}
