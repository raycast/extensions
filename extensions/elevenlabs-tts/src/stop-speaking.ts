import { showHUD } from "@raycast/api";
import { stopActivePlayback } from "./audio/playback";

export default async function Command() {
  const stopped = await stopActivePlayback();
  await showHUD(stopped ? "⏹️ Stopped" : "Nothing is playing");
}
