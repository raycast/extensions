import { Clipboard, showToast, Toast } from "@raycast/api";
import {
  ensureCredentialsForNoViewCommand,
  extractFirstHttpUrl,
  saveCardWithFeedback,
} from "./lib/capture";

export default async function SaveClipboardCommand() {
  if (!(await ensureCredentialsForNoViewCommand())) {
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
