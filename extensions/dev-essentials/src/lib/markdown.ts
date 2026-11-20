/** Wraps content in a fence longer than any backtick run inside it, so token data can't close the block. */
export function codeBlock(content: string, lang = ""): string {
  const longestRun = (content.match(/`+/g) ?? []).reduce((max, run) => Math.max(max, run.length), 0);
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}${lang}\n${content}\n${fence}`;
}
