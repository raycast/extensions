import { closeMainWindow } from "@raycast/api";
import { runTuttiAction } from "./tutti";

export default async function ToggleMute() {
  await closeMainWindow();
  await runTuttiAction("tutti://mute", "Toggled mute");
}
