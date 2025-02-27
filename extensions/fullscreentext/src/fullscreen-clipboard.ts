import { Clipboard, showToast, Toast } from "@raycast/api";
import { fullScreen } from "./utils";

export default async function Command() {
  let text;

  try {
    text = await Clipboard.readText();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text found in clipboard",
      message: String(error),
    });
  }

  if (!text) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text found in clipboard",
    });
    return;
  }

  await fullScreen(text);
}
