import { Clipboard, closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { fixBrokenURL } from "./utils";

export default async function Command() {
  try {
    const clipboard = await Clipboard.readText();

    if (!clipboard?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
        message: "Copy a broken URL first",
      });
      return;
    }

    const fixed = fixBrokenURL(clipboard.trim());

    if (!fixed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No broken URL detected",
        message: "Clipboard doesn't contain a split URL",
      });
      return;
    }

    await Clipboard.copy(fixed);
    await closeMainWindow();
    await showHUD("URL fixed and copied");
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to fix URL" });
  }
}
