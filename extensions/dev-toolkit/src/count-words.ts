import { Clipboard, showToast, Toast } from "@raycast/api";
import { produceOutput } from "./utils";

export default async function Command() {
  const clipboardText = (await Clipboard.read()).text;

  if (!clipboardText.trim()) {
    await showToast(Toast.Style.Failure, "Clipboard is empty");
    return;
  }

  const words = clipboardText.trim().split(/\s+/).length;

  await produceOutput(String(words));
}
