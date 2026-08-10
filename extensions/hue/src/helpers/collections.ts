import { HasId, Id } from "../lib/types";

export function updateItem<T extends HasId>(items: T[], id: Id, changes: Partial<T>): T[] {
  return items.map((it) => (it.id !== id ? it : { ...it, ...changes }));
}

export function updateItems<T extends HasId>(items: T[], changes: Map<Id, Partial<T>>): T[] {
  return items.map((it) => {
    const change = changes.get(it.id);
    return !change ? it : { ...it, ...change };
  });
}

export function replaceItems<T extends HasId>(items: T[], replacements: Partial<T>[]): T[] {
  return items.map((it) => {
    const replacement = replacements.find((r) => r.id === it.id);
    return !replacement ? it : { ...it, ...replacement };
  });
}

export function mergeObjectsById<T extends HasId>(items: T[]): T[] {
  return Object.values(
    items.reduce<Record<Id, T>>((acc, obj) => {
      acc[obj.id] = !acc[obj.id] ? obj : { ...acc[obj.id], ...obj };
      return acc;
    }, {}),
  );
}
