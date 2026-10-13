import { closeMainWindow, getSelectedText, showHUD } from "@raycast/api";
import { messageOf, speak } from "./lib/host.js";
import {
  isSpeaking,
  logFailure,
  readLiveStatus,
  sendControl,
} from "./lib/state.js";

export default async function Speak() {
  // Same key starts and stops: if anything is already being read, this run is the stop.
  const status = readLiveStatus();
  if (isSpeaking(status)) {
    sendControl("stop");
    await showHUD("Stopped");
    return;
  }

  await closeMainWindow();

  let text: string;
  try {
    text = (await getSelectedText()).trim();
  } catch {
    await showHUD("No text selected");
    return;
  }
  if (!text) {
    await showHUD("No text selected");
    return;
  }

  await showHUD("Preparing the voice…");
  try {
    await speak(text);
  } catch (error) {
    logFailure("speak", error);
    await showHUD(`Could not speak: ${messageOf(error)}`);
  }
}
