/**
 * From T, pick a set of properties whose values are in the type V
 */
export type PickByValue<T, V> = { [P in keyof T as T[P] extends V ? P : never]: T[P] };
/**
 * From T, pick keys from a set of properties whose values are in the type V
 */
export type KeysByValue<T, V> = keyof PickByValue<T, V>;

/**
 * Takes an array of objects and creates a normalized map of them against key idKey
 * @param arr an array of objects
 * @param idKey a key in each object that can be used as an id
 */
export function normalize<T, V extends string | number>(arr: readonly T[], idKey: KeysByValue<T, V>): Record<V, T>;
export function normalize<T, V extends string | number>(arr: readonly T[], findId: (item: T) => V): Record<V, T>;
export function normalize<T, V extends string | number>(
  arr: readonly T[],
  idKeyOrFindId: KeysByValue<T, V> | ((item: T) => V)
): Record<string, T> {
  const findId: (item: T) => V =
    typeof idKeyOrFindId === "function" ? idKeyOrFindId : (item) => item[idKeyOrFindId] as V;
  return arr.reduce((acc, obj) => {
    acc[findId(obj)] = obj;
    return acc;
  }, {} as Record<V, T>);
}
