import { Clipboard, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getBypassURL } from "./utils";

export default async function Command() {
  try {
    await closeMainWindow();
    await showHUD("Processing clipboard...");

    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard Empty",
        message: "Your clipboard is empty.",
      });
      return;
    }

    // Basic URL validation (starts with http or https)
    if (clipboardText.startsWith("http://") || clipboardText.startsWith("https://")) {
      const bypassedURL = getBypassURL(clipboardText);
      await Clipboard.copy(bypassedURL);
      await showHUD("Bypassed URL copied to clipboard!");
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL",
        message: "Clipboard content does not look like a valid URL.",
      });
    }
  } catch (error) {
    await showFailureToast(error, {
      title: "Error Processing Clipboard",
    });
  }
}
