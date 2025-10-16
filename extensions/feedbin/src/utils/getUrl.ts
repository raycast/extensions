import {
  Clipboard,
  Toast,
  getPreferenceValues,
  getSelectedText,
} from "@raycast/api";
import { closeAndShowToast } from "./closeAndShowToast";
import { isValidURL } from "./isValidURL";

export async function getUrl(text?: string) {
  if (text) {
    if (isValidURL(text)) {
      return new URL(text);
    } else {
      closeAndShowToast(
        Toast.Style.Failure,
        "Provided text is not a valid URL",
      );
      return;
    }
  }

  const { urlSource } = getPreferenceValues<ExtensionPreferences>();

  try {
    if (urlSource === "clipboard") {
      text = await Clipboard.readText();
    }
  } catch {
    closeAndShowToast(Toast.Style.Failure, "Unable to read clipboard");
    return;
  }

  try {
    if (urlSource === "selected-text") {
      text = await getSelectedText();
    }
  } catch {
    closeAndShowToast(Toast.Style.Failure, "No text selected");
    return;
  }

  if (!text) {
    closeAndShowToast(Toast.Style.Failure, "No text found");
    return;
  }

  try {
    return new URL(text);
  } catch {
    closeAndShowToast(
      Toast.Style.Failure,
      `${
        urlSource === "clipboard" ? "Clipboard content" : "Selected text"
      } is not a valid URL`,
    );
    return;
  }
}
