/**
 * Boxing helpers for the paginated App Store Connect hook.
 *
 * `useCachedPromise`'s pagination mode always accumulates an array of pages, but a
 * mapped response may be a collection *or* a single resource. A single resource is
 * therefore boxed with a marker so it can be told apart from a one-element collection.
 *
 * The marker lives on the value rather than in React state on purpose: cached data is
 * restored synchronously on the first render, before the fetcher runs, so any flag set
 * inside the fetcher is still unset the first time that data is read. It must also
 * survive a JSON round-trip, since that is how the cache stores it.
 *
 * Kept free of Raycast imports so the round-trip can be exercised outside Raycast.
 */

const SINGLE_RESULT = "__ascSingleResult";

interface BoxedSingleResult {
  [SINGLE_RESULT]: true;
  value: unknown;
}

function isBoxedSingleResult(value: unknown): value is BoxedSingleResult {
  // Own property with the exact marker value — `in` also matches inherited keys, and any
  // truthy value would do, so a resource that merely carried this key under a different
  // value would be unboxed to its `value` field instead of returned as a collection.
  return (
    typeof value === "object" &&
    value !== null &&
    Object.prototype.hasOwnProperty.call(value, SINGLE_RESULT) &&
    (value as BoxedSingleResult)[SINGLE_RESULT] === true
  );
}

/** Prepares a mapped response for accumulation: collections pass through, singles are boxed. */
export function boxPagedResult(mapped: unknown): unknown[] {
  return Array.isArray(mapped) ? mapped : [{ [SINGLE_RESULT]: true, value: mapped }];
}

/** Reverses {@link boxPagedResult} over the accumulated pages. */
export function unboxPagedResult<T>(pages: unknown[] | undefined): T | null {
  if (pages === undefined) {
    return null;
  }
  // A boxed single result is always the only element; a one-element collection is
  // still a collection, and carries no marker.
  if (pages.length === 1 && isBoxedSingleResult(pages[0])) {
    return pages[0].value as T;
  }
  return pages as T;
}
