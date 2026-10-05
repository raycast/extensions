import { openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { TranslateError } from "../lib/translate";

function needsPreferences(error: unknown): boolean {
  return error instanceof TranslateError && (error.kind === "missing-api-key" || error.kind === "auth");
}

export async function showTranslateErrorToast(error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);

  await showToast({
    style: Toast.Style.Failure,
    title: "Translation Failed",
    message,
    primaryAction: needsPreferences(error)
      ? {
          title: "Open Preferences",
          onAction: (toast) => {
            void toast.hide();
            void openExtensionPreferences();
          },
        }
      : undefined,
  });
}
