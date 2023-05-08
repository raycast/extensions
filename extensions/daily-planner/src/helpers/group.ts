/* eslint-disable @typescript-eslint/no-explicit-any */

export function groupByKey<K extends PropertyKey, T extends Record<K, PropertyKey | null | undefined>>(
  array: T[] | undefined,
  key: K
): Record<NonNullable<T[K]> | "null" | "undefined", T[]> {
  const grouped: Record<PropertyKey, T[]> = {};
  if (array) {
    for (const element of array) {
      const value = element[key];
      const groupKey = value === null ? "null" : value === undefined ? "undefined" : value;
      if (groupKey in grouped) {
        grouped[groupKey].push(element);
      } else {
        grouped[groupKey] = [element];
      }
    }
  }
  return grouped;
}

type MapValuesToKeysIfAllowed<T> = {
  [K in keyof T]: T[K] extends PropertyKey | null | undefined ? K : never;
};
type Filter<T> = MapValuesToKeysIfAllowed<T>[keyof T];

export function groupToMap<T extends Record<PropertyKey, any>, K extends Filter<T>>(
  iterable: Iterable<T> | undefined,
  key: K
): Map<T[K], T[]> {
  const map = new Map<T[K], T[]>();
  if (iterable) {
    for (const element of iterable) {
      const groupKey = element[key];
      const existing = map.get(groupKey);
      if (existing) {
        existing.push(element);
      } else {
        map.set(groupKey, [element]);
      }
    }
  }
  return map;
}

export function groupToMapFn<T extends Record<PropertyKey, any>, K extends PropertyKey>(
  array: T[] | undefined,
  fn: (element: T) => K
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  if (array) {
    for (const element of array) {
      const groupKey = fn(element);
      const existing = map.get(groupKey);
      if (existing) {
        existing.push(element);
      } else {
        map.set(groupKey, [element]);
      }
    }
  }
  return map;
}

export function groupByFn<T extends Record<PropertyKey, any>, K extends PropertyKey>(
  array: T[] | undefined,
  fn: (element: T) => K
): Record<K, T[]> {
  const grouped: Record<PropertyKey, T[]> = {};
  if (array) {
    for (const element of array) {
      const groupKey = fn(element);
      if (groupKey in grouped) {
        grouped[groupKey].push(element);
      } else {
        grouped[groupKey] = [element];
      }
    }
  }
  return grouped;
}
