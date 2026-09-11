import type { Icon } from "@raycast/api";
import { iconKeywords } from "./icon-keywords";

export function filterIcons(entries: [string, Icon][], text: string): [string, Icon][] {
  const query = text.trim().toLowerCase();
  if (!query) return entries;

  return entries.filter(
    ([name, icon]) =>
      name.toLowerCase().includes(query) || (iconKeywords[icon] ?? []).some((keyword) => keyword.includes(query)),
  );
}
