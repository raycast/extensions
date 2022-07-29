/**
 * Group a given array by a given key into a Map
 * Source: https://stackoverflow.com/a/38327540
 * @param list The list
 * @param keyProvider The key provider that is used for grouping
 */
export function groupBy<Key, Value>(list: Array<Value>, keyProvider: (input: Value) => Key): Map<Key, Array<Value>> {
  // Initialize the grouping Map
  const map = new Map<Key, Array<Value>>();
  // For each value in the list
  for (const value of list) {
    // Retrieve the key from the key provider
    const key = keyProvider(value);
    // Retrieve the current values from the grouping Map
    const values = map.get(key);
    // Check if values is falsy
    if (!values) {
      // Set value as array to grouping Map
      map.set(key, [value]);
    } else {
      // Push value to collection
      values.push(value);
    }
  }
  // Return map
  return map;
}
