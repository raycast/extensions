import { showFailureToast } from "@raycast/utils";

/**
 * Centralized non-fatal error reporter. Always logs to `console.error`, and by
 * default surfaces a `showFailureToast` with `context` as the title. Pass
 * `{ silent: true }` for internal polling / background paths that must not
 * spam the user with toasts.
 *
 * Never throws — a rejecting `showFailureToast` is caught and logged.
 *
 * @example
 *   await reportError("Could not clear Chromium quarantine attributes", error);
 *   await reportError("Log tail read failed", error, { silent: true });
 */
export async function reportError(
  context: string,
  error: unknown,
  options: { silent?: boolean } = {},
): Promise<void> {
  console.error(context, error);
  if (options.silent) {
    return;
  }
  try {
    await showFailureToast(error, { title: context });
  } catch (toastError) {
    console.error("reportError: showFailureToast rejected", toastError);
  }
}
