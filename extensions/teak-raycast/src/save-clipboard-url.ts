import { Clipboard, showToast, Toast } from "@raycast/api";
import {
  ensureCredentialsForNoViewCommand,
  extractFirstHttpUrl,
  saveCardWithFeedback,
  saveFilesWithFeedback,
  toLocalPath,
  uploadRejection,
} from "./lib/capture";

export default async function SaveClipboardCommand() {
  if (!(await ensureCredentialsForNoViewCommand())) {
    return;
  }

  const clipboard = await Clipboard.read();
  const copiedFile = clipboard.file ? toLocalPath(clipboard.file) : null;
  if (copiedFile) {
    const rejection = uploadRejection(copiedFile);
    if (rejection) {
      await showToast({
        message: rejection,
        style: Toast.Style.Failure,
        title: "Couldn't save the copied file",
      });
      return;
    }
    await saveFilesWithFeedback([copiedFile], "raycast_clipboard");
    return;
  }

  const clipboardText = clipboard.text.trim();

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
