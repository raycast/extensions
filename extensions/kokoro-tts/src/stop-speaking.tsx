import { showHUD } from "@raycast/api";
import { stopSpeaking } from "./utils/kokoro";

export default async function Command() {
  await stopSpeaking();
  await showHUD("Stopped");
}
