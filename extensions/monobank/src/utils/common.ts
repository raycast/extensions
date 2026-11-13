/** Resolves after `ms` milliseconds, or right away when `ms` isn't positive. */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(ms, 0)));
}

export function satisfiesTexts(searchText: string, ...texts: string[]): boolean {
  return texts.some((text) => text.toLowerCase().includes(searchText.toLowerCase()));
}

/** In the "all" category pinned items are shown in their own section, so they are removed from the rest. */
export function filterOutPinnedItems<T extends { id: string }>(props: {
  category: string;
  items: T[];
  pinned: string[];
}): T[] {
  const { category, items, pinned } = props;
  return category === "all" ? items.filter((item) => !pinned.includes(item.id)) : items;
}

/** A time like "14:32" for today, or "8 Nov, 14:32" for an earlier day. `time` is unix milliseconds. */
export function formatUpdatedAt(time: number) {
  const date = new Date(time);
  const clock = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return clock;

  return `${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}, ${clock}`;
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}
