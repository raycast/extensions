export function groupBy<K extends string | number | symbol, V>(array: V[], grouper: (item: V) => K): Record<K, V[]> {
  return array.reduce(
    (acc, item) => {
      const key = grouper(item);
      if (!acc[key]) {
        acc[key] = [item];
      } else {
        acc[key] = [...acc[key], item];
      }
      return acc;
    },
    {} as Record<K, V[]>,
  );
}
