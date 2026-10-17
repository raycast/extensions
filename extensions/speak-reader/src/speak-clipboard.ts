import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { speak, stopReadingAndWait } from "./reader";

export default async function Command() {
  const text = (await Clipboard.readText()) ?? "";
  if (!text.trim()) {
    await showHUD("Clipboard has no text");
    return;
  }

  try {
    // Replace whatever is currently being read with the clipboard text.
    await stopReadingAndWait();
    await speak(text);
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't start Speak Reader" });
  }
}
