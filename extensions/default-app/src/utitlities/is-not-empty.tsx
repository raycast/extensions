/**
 * Check if the given `Set` is not undefined and has at least one element
 */
export function isNotEmpty<T>(set: Set<T> | undefined): set is Set<T>;
/**
 * Check if the given `Array` is not undefined and has at least one element
 */
export function isNotEmpty<T>(array: Array<T> | undefined): array is Array<T>;

export function isNotEmpty<T>(collection: Array<T> | Set<T> | undefined) {
  if (collection instanceof Set) {
    return collection.size > 0;
  } else if (Array.isArray(collection)) {
    return collection.length > 0;
  }

  return false;
}
