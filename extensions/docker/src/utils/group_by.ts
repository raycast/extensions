export const groupBy = <T, K>(array: T[], predicate: (value: T, index: number, array: T[]) => K) =>
  array.reduce((map, value, index, array) => {
    const key = predicate(value, index, array);
    const collection = map.get(key);
    if (collection) collection.push(value);
    else map.set(key, [value]);
    return map;
  }, new Map<K, T[]>());

export const groupByToArray = <T, K>(array: T[], predicate: (value: T, index: number, array: T[]) => K) =>
  Array.from(groupBy(array, predicate));
