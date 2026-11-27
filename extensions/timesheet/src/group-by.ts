/**
 * Groups items by a label, in first-seen order. A Map rather than a plain object, so a
 * label such as "constructor" or "__proto__" cannot hit an inherited property.
 */
export function groupBy<T>(
  items: T[],
  label: (item: T) => string,
): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = label(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()];
}
