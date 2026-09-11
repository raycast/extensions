import { Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { outputResult } from "./utils";

export default async function Command() {
  try {
    const text = await Clipboard.readText();

    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
      });
      return;
    }

    // Remove all whitespace characters (spaces, tabs, line breaks, etc.)
    const processed = text.replace(/\s+/g, "");

    await outputResult(processed, "Clipboard text brute squeezed");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to process clipboard" });
  }
}
