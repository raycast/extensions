import { closeMainWindow } from "@raycast/api";
import { runTuttiAction } from "./tutti";

export default async function ToggleInputMute() {
  await closeMainWindow();
  await runTuttiAction("tutti://input-mute", "Microphone mute toggle requested");
}
