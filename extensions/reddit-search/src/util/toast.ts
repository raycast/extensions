import { showToast, Toast, Clipboard } from "@raycast/api";

/**
 * House-style failure toast: always offers a "Copy Error" action that copies the
 * full "title: message" to the clipboard. Use this for EVERY `Toast.Style.Failure`
 * so users can grab the error text (the house-style [both] rule).
 */
export async function failureToast(title: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong.";
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: {
      title: "Copy Error",
      onAction: async () => {
        await Clipboard.copy(`${title}: ${message}`);
      },
    },
  });
}

/**
 * Feedback when the user tries an action Reddit's rate limit is currently
 * refusing (e.g. changing sort during cooldown). Raycast dropdowns can't be truly
 * disabled, so a rejected change would otherwise look like a broken control — this
 * explains why, with the live countdown.
 */
export async function rateLimitToast(secondsRemaining: number): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Reddit rate limit",
    message: `Try again in ${secondsRemaining}s.`,
  });
}
