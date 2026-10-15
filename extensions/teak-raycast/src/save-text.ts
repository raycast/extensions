import { type LaunchProps, showToast, Toast } from "@raycast/api";
import {
  ensureCredentialsForNoViewCommand,
  saveCardWithFeedback,
} from "./lib/capture";

export default async function SaveTextCommand(
  props: LaunchProps<{ arguments: Arguments.SaveText }>,
) {
  if (!(await ensureCredentialsForNoViewCommand())) {
    return;
  }

  const fallbackText = props.fallbackText;
  const argumentContent = props.arguments?.content;
  const content = argumentContent ?? fallbackText ?? "";

  if (!content.trim()) {
    await showToast({
      message: "Type or dictate text to save, then retry.",
      style: Toast.Style.Failure,
      title: "Nothing to save",
    });
    return;
  }

  await saveCardWithFeedback(
    {
      cardType: "text",
      content,
      source: fallbackText ? "raycast_fallback" : "raycast_save_text",
    },
    {
      loadingTitle: "Saving to Teak...",
    },
  );
}
