import { showToast, Toast } from "@raycast/api";

/**
 * Fixes the "spinner never stops" bug (user-reported, screenshot: "Preset saved!" shown
 * with the Animated spinner still running): mutating `.style`/`.title` on an
 * already-presented `Toast` does not reliably swap its icon away from the spinner at
 * runtime, even though `@raycast/api`'s own docs show exactly that pattern and it is
 * hard to distinguish from a working case by reading the code alone (this codebase has
 * ~17 call sites doing the same mutation; only this shape was caught live). Hiding the
 * animated toast and presenting a fresh one for the resolved state sidesteps the issue
 * unconditionally, regardless of root cause.
 *
 * Use for any operation that legitimately needs an in-progress indicator (something
 * observably slower than a LocalStorage write — a network call, a stream, a file write).
 * For a synchronous/near-instant local write, prefer `resolveResult` below and skip the
 * animated phase entirely: an Animated toast for a sub-millisecond operation is noise a
 * user can visually catch mid-flicker, which is its own (milder) version of this bug.
 */
export async function resolveToast(toast: Toast, next: Toast.Options): Promise<void> {
  await toast.hide();
  await showToast(next);
}

/**
 * Shows only the resolved (Success/Failure) toast for an operation with no meaningful
 * latency — no Animated phase at all, so there is nothing that could get stuck spinning.
 * Matches the shape `resolveToast` reduces to for the "hide, then show fresh" fix, but
 * skips the hide() because nothing was shown yet.
 */
export async function showResolvedToast(options: Toast.Options): Promise<Toast> {
  return showToast(options);
}
