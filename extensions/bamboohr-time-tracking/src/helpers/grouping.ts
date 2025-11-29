import { NormalizedTimeEntry } from "../bamboo/api";

export function groupEntriesByDate(
  entries: NormalizedTimeEntry[],
): Record<string, NormalizedTimeEntry[]> {
  const grouped: Record<string, NormalizedTimeEntry[]> = {};

  entries.forEach((entry) => {
    const dateKey = entry.date ?? "Unknown date";
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(entry);
  });

  Object.values(grouped).forEach((entryList) => {
    entryList.sort(
      (a, b) => (b.start?.getTime() ?? 0) - (a.start?.getTime() ?? 0),
    );
  });

  return grouped;
}
