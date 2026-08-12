import { Clipboard, Toast, showToast } from "@raycast/api";

/** Copy the message of a failure to the clipboard — House Style Copy-Error action. */
export function copyErrorAction(message: string): Toast.ActionOptions {
  return {
    title: "Copy Error",
    onAction: async (toast) => {
      await Clipboard.copy(message);
      await toast.hide();
    },
  };
}

/** Show a failure toast with a Copy-Error action, per House Style. */
export async function reportFailure(title: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : "Unknown error";
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: copyErrorAction(message),
  });
}
