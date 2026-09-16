import type { Entry } from "./messages";

/** Only this visit's messages; opening a view never erases the bot's stored history. */
export function sessionMessages(
  entries: readonly Entry[],
  openedAt: number,
  initialIds: ReadonlySet<string>,
): Entry[] {
  return entries.filter((entry) => {
    if (
      typeof entry.timestampMs === "number" &&
      Number.isFinite(entry.timestampMs)
    ) {
      return entry.timestampMs >= openedAt;
    }
    return !initialIds.has(entry.id);
  });
}

/** Initialize at latest, then preserve the message being read across history updates. */
export function selectedMessageId(
  entries: readonly Entry[],
  previous?: string,
): string | undefined {
  return previous && entries.some((entry) => entry.id === previous)
    ? previous
    : entries.at(-1)?.id;
}

/** A fence longer than any source backtick run preserves even nested code examples. */
export function markdownSource(text: string): string {
  const longest = Math.max(
    2,
    ...Array.from(text.matchAll(/`+/g), (match) => match[0].length),
  );
  const fence = "`".repeat(longest + 1);
  return `${fence}text\n${text}\n${fence}`;
}
