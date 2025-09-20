/**
 * Group items of an array by key
 * @param array
 * @param key
 * @param defaultKey Default key for items without key
 */
export function groupBy<T extends Record<string, unknown>>(
  array: T[],
  key: keyof T,
  defaultKey?: string,
): { [key: string]: T[] } {
  return array.reduce(
    (groups, item) => {
      const group: string = (item[key] as unknown as string) ?? defaultKey;
      groups[group] = groups[group] ?? [];
      groups[group].push(item);
      return groups;
    },
    {} as { [key: string]: T[] },
  );
}

/**
 * Sort an array of object by key
 */
export function sortBy<T extends Record<string, unknown>>(
  array: T[],
  key: keyof T,
  direction: "asc" | "desc" = "asc",
): T[] {
  return array.sort((a, b) => compare(a, b, key, direction));
}

/**
 * Compare to object for sorting
 */
export function compare<T extends Record<string, unknown>>(
  firstItem: T,
  secondItem: T,
  key: keyof T,
  direction: "asc" | "desc" = "asc",
): -1 | 0 | 1 {
  if (firstItem[key] < secondItem[key]) {
    return direction === "asc" ? -1 : 1;
  }
  if (firstItem[key] > secondItem[key]) {
    return direction === "asc" ? 1 : -1;
  }
  return 0;
}
