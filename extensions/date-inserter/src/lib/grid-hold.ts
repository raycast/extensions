import { HoldOptions } from "./update-scheduler";

export type ArrowKey = "arrowLeft" | "arrowRight" | "arrowUp" | "arrowDown";

/**
 * Hold behavior for arrow keys in a calendar grid; see `UpdateScheduler`.
 *
 * While left/right is held, the selection is only shown when it reaches
 * another row (or page), so the highlight keeps landing in the same column.
 * While up/down is held, it is only shown when the page changes; grids whose
 * up/down already turn a whole row per press pass no `pageOf` and get plain
 * throttling instead.
 */
export function gridHold<T>(
  key: ArrowKey,
  rowOf: (value: T) => string,
  pageOf?: (value: T) => string,
): HoldOptions<T> | undefined {
  const pageChanged = (shown: T, next: T) => pageOf !== undefined && pageOf(shown) !== pageOf(next);
  if (key === "arrowLeft" || key === "arrowRight") {
    return { key, isBoundary: (shown, next) => rowOf(shown) !== rowOf(next) || pageChanged(shown, next) };
  }
  return pageOf ? { key, isBoundary: pageChanged } : undefined;
}
