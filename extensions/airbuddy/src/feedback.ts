import { Clipboard, Toast, showToast } from "@raycast/api";

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  // `String({})` yields "[object Object]" — copying that defeats the whole point of Copy Error.
  // Serialize objects so the user pastes something a human (or a bug report) can actually use.
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return "Unserializable error object";
    }
  }

  return String(error);
}

/**
 * Show a NEW failure toast. Use this in a `catch` — when there's a thrown error to report.
 *
 * House style requires a "Copy Error" primaryAction on every failure toast; putting it here means
 * no call site can omit it.
 */
export async function showFailure(title: string, error: unknown): Promise<void> {
  const message = describeError(error);
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: {
      title: "Copy Error",
      onAction: async () => {
        await Clipboard.copy(message);
      },
    },
  });
}

/**
 * Convert an ALREADY-SHOWING animated toast into a failure. Use this for pre-flight guard branches
 * — "no headset connected", "this device doesn't support that mode" — where there's no thrown error
 * and a toast is already on screen.
 *
 * This primitive exists because `showFailure()` can only fire a *new* toast, so nine guard branches
 * were hand-rolling `toast.style = Failure` and silently dropping the mandatory Copy Error action.
 * Route them all through here instead.
 */
export function failToast(toast: Toast, title: string, message: string): void {
  toast.style = Toast.Style.Failure;
  toast.title = title;
  toast.message = message;
  toast.primaryAction = {
    title: "Copy Error",
    onAction: async () => {
      await Clipboard.copy(`${title}: ${message}`);
    },
  };
}
