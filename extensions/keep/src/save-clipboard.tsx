import { Clipboard, showToast, Toast } from "@raycast/api";
import { saveLink } from "./api";

export default async function SaveClipboard() {
  const clipboard = (await Clipboard.readText())?.trim();
  if (!clipboard) {
    await showToast(Toast.Style.Failure, "Clipboard is empty");
    return;
  }

  const toast = await showToast(Toast.Style.Animated, "Saving link...");

  try {
    const result = await saveLink({
      url: clipboard,
      source: "raycast:clipboard",
    });
    toast.style = Toast.Style.Success;
    toast.title = result.added ? "Link saved" : "Link updated";
    toast.message = result.normalizedUrl;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save";
    toast.message = String((error as Error).message || error);
  }
}
