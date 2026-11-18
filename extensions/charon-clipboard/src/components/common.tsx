/** Render text as a code block, with a fence longer than any backtick run inside it. */
export function codeBlock(text: string) {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((m) => m.length));
  const fence = "`".repeat(longest + 1);
  return `${fence}\n${text}\n${fence}`;
}

export function firstLine(text: string, max = 80) {
  const line = text.trim().split(/\r?\n/)[0] ?? "";
  return line.length > max ? `${line.slice(0, max)}…` : line || "(Blank)";
}
