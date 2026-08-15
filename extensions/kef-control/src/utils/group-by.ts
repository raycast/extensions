/**
 * @param array - The array to group
 * @param getKeyFromItem - The function to extract the key from each item
 * @returns The grouped array
 */
export function groupBy<T, K extends string | number | symbol>(array: T[], getKeyFromItem: (item: T) => K) {
  return array.reduce(
    (acc, item) => {
      const groupKey = getKeyFromItem(item);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}
