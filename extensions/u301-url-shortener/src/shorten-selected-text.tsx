import { getSelectedText, Clipboard, showToast, Toast } from "@raycast/api";
import { isValidURL, shortenURL } from "./util";

async function reportError({ message }: { message: string }) {
  await showToast(Toast.Style.Failure, "Error", message.toString());
}

export default async function Command() {
  try {
    const selectedText = await getSelectedText();
    if (!isValidURL(selectedText)) {
      return reportError({ message: "Selected text is not a valid URL" });
    }

    showToast({
      style: Toast.Style.Animated,
      title: "Shortening",
    });
    const { shortened, message = "Failed to shorten" } = await shortenURL(selectedText);
    if (!shortened) {
      return reportError({ message });
    }
    await Clipboard.copy(shortened);
    await showToast(Toast.Style.Success, "Success", "Copied shortened URL to clipboard");
  } catch (error) {
    return reportError({
      message: "Not able to get selected text",
    });
  }
}
