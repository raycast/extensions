import { HasId, Id } from "../lib/types";

export function updateItems<T extends HasId>(items: T[], changes: Map<Id, Partial<T>>): T[] {
  return items.map((it) => {
    const change = changes.get(it.id);
    return !change ? it : { ...it, ...change };
  });
}

export const byName = (a: { metadata: { name: string } }, b: { metadata: { name: string } }) =>
  a.metadata.name.localeCompare(b.metadata.name);
