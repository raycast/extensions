import { showToast, Toast } from "@raycast/api";

/**
 * Resolves an in-progress toast by hiding it and presenting a fresh one for the outcome.
 *
 * This exists because of a screenshot: "Preset saved!" rendered beside a still-spinning
 * Animated icon. Mutating `.style`/`.title` on a presented toast IS supported and works —
 * the actual defect was showing an Animated toast for work that was never asynchronous, so
 * the spinner had no latency to cover and the eye caught it mid-flicker. Hiding and
 * re-presenting removes any dependence on the mutation landing at all.
 *
 * Use for an operation that genuinely needs an in-progress indicator — something
 * observably slower than a LocalStorage write: a network call, a stream, a file write. For
 * a near-instant local write use `showResolvedToast` below and skip the animated phase
 * entirely rather than showing a spinner with nothing to wait for.
 */
export async function resolveToast(toast: Toast, next: Toast.Options): Promise<void> {
  await toast.hide();
  await showToast(next);
}

/**
 * The resolved (Success/Failure) toast for an operation with no meaningful latency — no
 * Animated phase at all, so there is no spinner to strand. A thin alias for `showToast`,
 * named so the call sites read as the deliberate counterpart to `resolveToast` rather than
 * as someone having forgotten the in-progress indicator.
 */
export async function showResolvedToast(options: Toast.Options): Promise<Toast> {
  return showToast(options);
}
