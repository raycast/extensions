import { Entry, idOf } from "./api";

export function groupRecent(entries: Entry[]) {
  const groups = new Map<string, { entry: Entry; count: number }>();
  for (const entry of entries) {
    if (!entry.end) continue;
    const key = JSON.stringify([
      entry.description ?? "",
      idOf(entry.project),
      idOf(entry.activity),
      [
        ...new Set(
          (entry.tags ?? []).map((tag) =>
            typeof tag === "string" ? tag : tag.name,
          ),
        ),
      ].sort(),
    ]);
    const group = groups.get(key);
    if (group) {
      group.count++;
      if (Date.parse(entry.begin) > Date.parse(group.entry.begin))
        group.entry = entry;
    } else groups.set(key, { entry, count: 1 });
  }
  return [...groups.values()].sort(
    (a, b) => Date.parse(b.entry.begin) - Date.parse(a.entry.begin),
  );
}
