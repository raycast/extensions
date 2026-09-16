/**
 * Process names and command lines come from other users' processes, so they are untrusted
 * text. Raycast renders detail panels as Markdown; these helpers keep that text inside the
 * element it was meant for instead of letting a crafted name restyle the panel.
 */

/** Wraps untrusted text in a fence longer than any backtick run it contains. */
export function fencedCodeBlock(content: string): string {
  const longestRun = [...content.matchAll(/`+/g)].reduce((longest, [run]) => Math.max(longest, run.length), 0);
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}\n${content}\n${fence}`;
}

/** Escapes the inline Markdown syntax characters for text used in a sentence. */
export function escapeInline(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|<>~]/g, (character) => `\\${character}`);
}
