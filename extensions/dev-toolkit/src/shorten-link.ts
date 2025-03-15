import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput, showError } from "./utils";
import fetch from "node-fetch";

export default async function Command() {
  try {
    const clipboardText = (await Clipboard.read()).text;

    if (!clipboardText.trim()) {
      await showToast(Toast.Style.Failure, "Clipboard is empty");
      return;
    }

    const url = clipboardText.trim();

    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    const shortenedUrl = await response.text();

    await produceOutput(shortenedUrl);
  } catch (error) {
    await showError("Failed to shorten URL: " + String(error));
  }
}
