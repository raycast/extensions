import { Clipboard, closeMainWindow, showHUD, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getRemovePaywallURL } from "./utils";

export default async function Command() {
  try {
    await showHUD("Processing clipboard...");

    const preferences = getPreferenceValues<Preferences>();
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard Empty",
        message: "Your clipboard is empty.",
      });
      return;
    }

    if (clipboardText.startsWith("http://") || clipboardText.startsWith("https://")) {
      const removedPaywallURL = getRemovePaywallURL(clipboardText, preferences.service || "https://12ft.io");
      await closeMainWindow();
      await Clipboard.copy(removedPaywallURL);
      await showHUD("URL copied to clipboard!");
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
