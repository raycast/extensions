import {
  Clipboard,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { restoreText } from "./redact";

export default async function Command() {
  let text: string;
  try {
    text = await getSelectedText();
  } catch {
    await showHUD("No text selected");
    return;
  }

  try {
    const { text: restored, restored: count } = await restoreText(text);
    if (count === 0) {
      await showHUD("No placeholders from the last redaction found");
      return;
    }
    await Clipboard.paste(restored);
    await showHUD(`Restored ${count} value${count === 1 ? "" : "s"}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Restore failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
