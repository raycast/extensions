/**
 * Wraps untrusted text in a Markdown fence longer than any backtick run it contains, so a
 * command line chosen by whoever started the process cannot break out of the block.
 */
export default function codeBlock(content: string) {
  const longestRun = [...content.matchAll(/`+/g)].reduce((longest, [run]) => Math.max(longest, run.length), 0);
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}\n${content}\n${fence}`;
}
