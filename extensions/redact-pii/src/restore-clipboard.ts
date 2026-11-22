import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { restoreText } from "./redact";

export default async function Command() {
  const text = await Clipboard.readText();
  if (!text?.trim()) {
    await showHUD("Clipboard has no text");
    return;
  }

  try {
    const { text: restored, restored: count } = await restoreText(text);
    if (count === 0) {
      await showHUD("No placeholders from the last redaction found");
      return;
    }
    await Clipboard.copy(restored);
    await showHUD(
      `Restored ${count} value${count === 1 ? "" : "s"} · copied to clipboard`,
    );
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Restore failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
