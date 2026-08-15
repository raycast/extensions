import { type LaunchProps, showToast, Toast } from "@raycast/api";
import {
  ensureCredentialsForNoViewCommand,
  extractFirstHttpUrl,
  saveCardWithFeedback,
} from "./lib/capture";

export default async function SaveTextCommand(
  props: LaunchProps<{ arguments: Arguments.SaveText }>,
) {
  if (!(await ensureCredentialsForNoViewCommand())) {
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
