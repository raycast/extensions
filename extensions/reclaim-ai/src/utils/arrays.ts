import { Event } from "../types/event";
import { Falsy } from "../types/types";

export const sortEvents = (a: Partial<Event>, b: Partial<Event>) => {
  if (a.eventStart === undefined || b.eventStart === undefined) {
    return 0;
  }
  if (a.eventStart < b.eventStart) {
    return -1;
  }
  if (a.eventStart > b.eventStart) {
    return 1;
  }
  return 0;
};

/**
 * A comparator to feed into a sort function
 */
export type SortStateComparator<T> = (a: T, b: T) => number;

/**
 * comparator for number arrays
 */
export const numComparator: SortStateComparator<number | undefined> = (a = Infinity, b = Infinity) =>
  a === b ? 0 : a - b;
/**
 * comparator for string arrays
 */
export const alphaComparator: SortStateComparator<string | undefined> = (a = "", b = "") => {
  a = a.toLowerCase();
  b = b.toLowerCase();
  if (a && !b) return -1;
  if (!a && b) return 1;

  return a === b ? 0 : a > b ? 1 : -1;
};

export type MakeOrderedListComparatorOptions<T> = {
  fallbackComparator?: SortStateComparator<T>;
};

/**
 * Creates a comparator which orders objects in a list according to order
 * @param order The order in which to sort
 * @returns a comparator
 */
export const makeOrderedListComparator = <T>(
  order: readonly T[],
  options: MakeOrderedListComparatorOptions<T> = {}
): SortStateComparator<T> => {
  const { fallbackComparator = (a: T, b: T) => alphaComparator(`${a}`, `${b}`) } = options;

  const indexLookup = Object.values(order).reduce((lookup, item, i) => {
    lookup.set(item, i);
    return lookup;
  }, new Map<T, number>());

  return (a, b) => {
    const iA = indexLookup.get(a);
    const iB = indexLookup.get(b);

    if (iA === undefined && iB === undefined) return fallbackComparator(a, b);
    if (iA === undefined) return 1;
    if (iB === undefined) return -1;

    return numComparator(iA === undefined ? Infinity : iA, iB === undefined ? Infinity : iB);
  };
};

/**
 * Equivilant of [].filter(i => !!i) but correctly removes falsy values from from the type
 * @param items An array of items
 * @returns The same array without falsy values
 */
export const filterFalsy = <T>(items?: readonly T[]) => (items?.filter((i) => !!i) || []) as Exclude<T, Falsy>[];
