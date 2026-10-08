import { DeepPartial, HasId, Id } from "../lib/types";

export function updateItems<T extends HasId>(items: T[], changes: Map<Id, DeepPartial<T>>): T[] {
  return items.map((it) => {
    const change = changes.get(it.id);
    return !change ? it : merge(it, change);
  });
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Merges objects key by key, so a change keeps the properties it leaves out, like a light's mirek_schema.
function merge<T>(item: T, change: DeepPartial<T>): T {
  if (!isObject(item) || !isObject(change)) return change as T;
  const merged: Record<string, unknown> = { ...item };
  for (const [key, value] of Object.entries(change)) {
    if (value !== undefined) merged[key] = merge(merged[key], value);
  }
  return merged as T;
}

export const byName = (a: { metadata: { name: string } }, b: { metadata: { name: string } }) =>
  a.metadata.name.localeCompare(b.metadata.name);
