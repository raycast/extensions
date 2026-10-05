import { List } from "../types";

/**
 * Label lists so no two read the same.
 *
 * Karakeep enforces uniqueness on (userId, id) only — never on name — so two
 * lists can legitimately share a name and icon. Rendered plainly that produces
 * identical rows with no way to tell them apart, which is worst while
 * searching, since filtering hides the surrounding hierarchy that would
 * otherwise distinguish them.
 *
 * Only ambiguous names are expanded, so the common case stays clean. Parent
 * path first; if that still collides (two lists with the same name at the same
 * level) fall back to the id, which is ugly but guaranteed unique — a short
 * slice of it is not, since ids can share a suffix.
 */
export function labelLists<T extends Pick<List, "id" | "name" | "parentId">>(lists: T[]): { list: T; label: string }[] {
  const byId = new Map(lists.map((list) => [list.id, list]));
  const nameCounts = new Map<string, number>();
  for (const list of lists) nameCounts.set(list.name, (nameCounts.get(list.name) ?? 0) + 1);

  const labeled = lists.map((list) => {
    if ((nameCounts.get(list.name) ?? 0) < 2) return { list, label: list.name };

    const ancestors: string[] = [];
    const seen = new Set<string>([list.id]);
    let parent = list.parentId ? byId.get(list.parentId) : undefined;
    // A cycle here would hang the render; parentId is only "set null" on
    // delete, so nothing structurally prevents one.
    while (parent && !seen.has(parent.id)) {
      seen.add(parent.id);
      ancestors.unshift(parent.name);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }

    return { list, label: [...ancestors, list.name].join(" / ") };
  });

  const labelCounts = new Map<string, number>();
  for (const { label } of labeled) labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);

  return labeled.map((entry) =>
    (labelCounts.get(entry.label) ?? 0) < 2 ? entry : { ...entry, label: `${entry.label} (${entry.list.id})` },
  );
}
