/** Wraps content in a fence longer than any backtick run inside it, so token data can't close the block. */
export function codeBlock(content: string, lang = ""): string {
  const longestRun = Math.max(0, ...(content.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}${lang}\n${content}\n${fence}`;
}
