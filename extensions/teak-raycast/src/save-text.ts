import {
  type LaunchProps,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { extractFirstHttpUrl, saveCardWithFeedback } from "./lib/capture";
import { getPreferences } from "./lib/preferences";

export default async function SaveTextCommand(
  props: LaunchProps<{ arguments: Arguments.SaveText }>,
) {
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

  const fallbackText = props.fallbackText?.trim();
  const argumentContent = props.arguments?.content?.trim();
  const content = argumentContent || fallbackText || "";

  if (!content) {
    await showToast({
      message: "Type or dictate text to save, then retry.",
      style: Toast.Style.Failure,
      title: "Nothing to save",
    });
    return;
  }

  const url = extractFirstHttpUrl(content);

  await saveCardWithFeedback(
    {
      content,
      source: fallbackText ? "raycast_fallback" : "raycast_save_text",
      url: url ?? undefined,
    },
    {
      loadingTitle: "Saving to Teak...",
    },
  );
}
