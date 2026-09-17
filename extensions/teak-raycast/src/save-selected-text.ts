import { getSelectedText, showToast, Toast } from "@raycast/api";
import {
  ensureCredentialsForNoViewCommand,
  extractFirstHttpUrl,
  saveCardWithFeedback,
} from "./lib/capture";

export default async function SaveSelectedTextCommand() {
  if (!(await ensureCredentialsForNoViewCommand())) {
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
