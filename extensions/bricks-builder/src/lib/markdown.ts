/**
 * Escapes text from a site's visitors (form submissions) or from WordPress before it goes into a
 * Raycast Markdown view, so it shows as typed: a submitted ![x](https://…) stays text instead of
 * loading a remote image.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|<>~]/g, "\\$&");
}

/** The longest run of backticks in `text`, so a fence around it can be longer. */
function longestBacktickRun(text: string): number {
  return Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
}

/** A fenced code block that ``` inside `code` can't close early. */
export function codeBlock(code: string, language = ""): string {
  const fence = "`".repeat(Math.max(3, longestBacktickRun(code) + 1));
  return `${fence}${language}\n${code}\n${fence}`;
}

/** Inline code that backticks inside `text` can't close early. */
export function inlineCode(text: string): string {
  const ticks = "`".repeat(longestBacktickRun(text) + 1);
  const padded = text.startsWith("`") || text.endsWith("`") ? ` ${text} ` : text;
  return `${ticks}${padded}${ticks}`;
}
