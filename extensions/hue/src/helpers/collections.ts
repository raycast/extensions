import { DeepPartial, HasId, HueEvent, Id } from "../lib/types";

// An add brings a whole resource, which replaces one with its ID, a delete only the ID, and an update what changed.
export function applyEvent<T extends HasId>(
  items: T[],
  type: HueEvent["type"],
  resources: (DeepPartial<T> & HasId)[],
): T[] {
  switch (type) {
    case "add":
      return resources.reduce(
        (result, resource) =>
          result.some((it) => it.id === resource.id)
            ? result.map((it) => (it.id === resource.id ? (resource as T) : it))
            : [...result, resource as T],
        items,
      );
    case "delete":
      return items.filter((it) => !resources.some((resource) => resource.id === it.id));
    case "update":
      return resources.reduce((result, change) => updateItems(result, new Map([[change.id, change]])), items);
    case "error":
      return items;
  }
}

export function updateItems<T extends HasId>(items: T[], changes: Map<Id, DeepPartial<T>>): T[] {
  return items.map((it) => {
    const change = changes.get(it.id);
    return change ? merge(it, change) : it;
  });
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Merges objects key by key, so a change keeps the properties it leaves out, like a light's mirek_schema.
export function merge<T>(item: T, change: DeepPartial<T>): T {
  if (!isObject(item) || !isObject(change)) return change as T;
  const merged: Record<string, unknown> = { ...item };
  for (const [key, value] of Object.entries(change)) {
    if (value !== undefined) merged[key] = merge(merged[key], value);
  }
  return merged as T;
}

export const byName = (a: { metadata: { name: string } }, b: { metadata: { name: string } }) =>
  a.metadata.name.localeCompare(b.metadata.name);
