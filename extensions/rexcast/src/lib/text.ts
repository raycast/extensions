/** A Markdown fence longer than any backtick run in `text`, so the text cannot close it early. */
export function fence(text: string): string {
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  return "`".repeat(Math.max(3, longest + 1));
}

export function codeBlock(text: string): string {
  const f = fence(text);
  return `${f}\n${text}\n${f}`;
}

/** After reading from the middle of a text, the first line is cut: drop it. */
export const dropPartialFirstLine = (text: string) => (text.includes("\n") ? text.slice(text.indexOf("\n") + 1) : text);

/** The last `n` lines, scanning from the end instead of splitting the whole text. */
export function lastLines(text: string, n: number): string {
  let idx = text.length;
  for (let i = 0; i < n; i++) {
    const prev = text.lastIndexOf("\n", idx - 1);
    if (prev < 0) return text;
    idx = prev;
  }
  return text.slice(idx + 1);
}
