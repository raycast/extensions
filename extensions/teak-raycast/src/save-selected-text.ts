import {
  getSelectedText,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { extractFirstHttpUrl, saveCardWithFeedback } from "./lib/capture";
import { getPreferences } from "./lib/preferences";

export default async function SaveSelectedTextCommand() {
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

  let selectedText = "";
  try {
    selectedText = (await getSelectedText()).trim();
  } catch {
    await showToast({
      message:
        "Highlight text in any app, then run this command again. Some apps do not expose their selection to macOS.",
      style: Toast.Style.Failure,
      title: "Nothing selected",
    });
    return;
  }

  if (!selectedText) {
    await showToast({
      message: "Highlight some text, then run this command again.",
      style: Toast.Style.Failure,
      title: "Selection is empty",
    });
    return;
  }

  const url = extractFirstHttpUrl(selectedText);

  await saveCardWithFeedback(
    {
      content: selectedText,
      source: "raycast_selected_text",
      url: url ?? undefined,
    },
    {
      loadingTitle: "Saving selection...",
    },
  );
}
