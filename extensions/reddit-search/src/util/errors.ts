/**
 * True when an error is the result of an `AbortController.abort()`.
 *
 * The extension previously imported `AbortError` from `node-fetch`. On native
 * `fetch` (Node 18+) an aborted request rejects with a `DOMException` whose
 * `name` is `"AbortError"` instead, so identity checks against the old class
 * silently stop matching — which would surface every superseded keystroke
 * search as a real error toast.
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
