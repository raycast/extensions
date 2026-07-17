import { Clipboard, Toast, showHUD, showToast } from "@raycast/api";
import { createPaste } from "./api";
import { addToHistory } from "./history";

export default async function PasteClipboard() {
  const content = await Clipboard.readText();

  if (!content?.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Clipboard is empty",
      message: "Copy some text first.",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating paste",
  });

  try {
    const result = await createPaste(content);
    await Clipboard.copy(result.url);
    await addToHistory({ url: result.url, content, partial: result.partial });
    await toast.hide();
    await showHUD(result.partial ? "Paste partially uploaded, URL copied" : "Paste URL copied");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to create paste";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
