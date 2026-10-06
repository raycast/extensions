import { closeMainWindow, getSelectedText, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { speak, stopReading } from "./reader";

export default async function Command() {
  // Same hotkey toggles: pressing it while reading stops the reader.
  if (stopReading()) {
    await showHUD("Stopped reading");
    return;
  }

  let text = "";
  try {
    text = await getSelectedText();
  } catch {
    // no selection
  }
  if (!text.trim()) {
    await showHUD("Select some text first");
    return;
  }

  try {
    await speak(text);
    await closeMainWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't start Speak Reader" });
  }
}
