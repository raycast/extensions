// Records keyed by names a user or a file chooses (variables, pattern names) have no prototype, so a
// key named `__proto__` or `constructor` is data like any other: assigning `__proto__` on a plain `{}`
// calls the inherited setter and drops the key, and a lookup can find an inherited member instead of
// nothing (review, 2026-10-19; Greptile, raycast/extensions#32650). Read them with Object.hasOwn.

/** A prototype-free record holding each part's own keys, a later part winning. */
export function dict<V>(...parts: Readonly<Record<string, V>>[]): Record<string, V> {
  return Object.assign(Object.create(null), ...parts);
}
