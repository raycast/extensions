import { showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { MissingKeyError } from "../llm/config";

export async function reportError(err: unknown): Promise<void> {
  if (err instanceof MissingKeyError) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Missing ${err.provider} API key`,
      message: "Open preferences to add it",
      primaryAction: {
        title: "Open Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return;
  }
  await showToast({
    style: Toast.Style.Failure,
    title: "Something went wrong",
    message: String(err).slice(0, 200),
  });
}
