import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { remoApi } from "./utils/api";
import { handleError } from "./utils/errors";

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

    const preferences = getPreferenceValues();

    await showToast({
      style: Toast.Style.Animated,
      title: "Capturing your note...",
    });

    await remoApi.quickCaptureNote({
      content: text,
      autoFormat: preferences.autoFormat,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Note created",
      message: preferences.autoFormat ? "AI formatting started in background" : "Saved to Quick Capture",
    });
  } catch (error) {
    handleError(error, "Failed to create note");
  }
}
