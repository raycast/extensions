export const MAX_INPUT_CHARS = 20000;

export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

export function isBlank(text: string | undefined | null): boolean {
  return !text || text.trim().length === 0;
}

/** Wrap text in a Markdown fence that is longer than any backtick run inside it. */
export function fenceBlock(text: string): string {
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}text\n${text}\n${fence}`;
}

export function parseTimeoutMs(value: string | undefined, fallbackSeconds = 60): number {
  const seconds = Number.parseFloat(value ?? "");
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 600) : fallbackSeconds;
  return Math.round(safe * 1000);
}
