import {
  Clipboard,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { extractFirstHttpUrl, saveCardWithFeedback } from "./lib/capture";
import { getPreferences } from "./lib/preferences";

export default async function SaveClipboardCommand() {
  const { apiKey } = getPreferences();
  if (!apiKey?.trim()) {
    await showToast({
      message: "Set your Teak API key in extension preferences to continue.",
      primaryAction: {
        onAction: () => {
          void openExtensionPreferences();
        },
        title: "Open Preferences",
      },
      style: Toast.Style.Failure,
      title: "Missing API key",
    });
    return;
  }

  const clipboardText = (await Clipboard.readText())?.trim() ?? "";

  if (!clipboardText) {
    await showToast({
      message:
        "Copy text, a URL, or any other content, then run this command again.",
      style: Toast.Style.Failure,
      title: "Clipboard is empty",
    });
    return;
  }

  const url = extractFirstHttpUrl(clipboardText);

  await saveCardWithFeedback(
    {
      content: clipboardText,
      source: "raycast_clipboard",
      url: url ?? undefined,
    },
    {
      loadingTitle: "Saving clipboard...",
    },
  );
}
