import { Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    const clipboard = (await Clipboard.readText()) || "";

    // Clean everything before the first double line break
    const match = clipboard.match(/^([\s\S]+?)\r?\n\r?\n/);
    const cleaned = match ? match[1].trim() : clipboard;

    await Clipboard.copy(cleaned);
    await Clipboard.paste(cleaned);
  } catch (error) {
    showFailureToast(error, { title: "Failed to process clipboard content" });
  }
}
