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
