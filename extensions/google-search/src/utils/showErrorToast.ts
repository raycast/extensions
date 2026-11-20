import { Clipboard, showToast, Toast } from "@raycast/api";

export async function showErrorToast(title: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: errorMessage,
    primaryAction: {
      title: "Copy Error",
      onAction: (toast) => {
        Clipboard.copy(errorMessage);
        toast.hide();
      },
    },
  });
}
