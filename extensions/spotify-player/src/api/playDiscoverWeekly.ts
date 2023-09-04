import { runAppleScript } from "@raycast/utils";
import { buildScriptEnsuringSpotifyIsRunning } from "../helpers/applescript";

export async function playDiscoverWeekly() {
  const script = buildScriptEnsuringSpotifyIsRunning(`play track "spotify:playlist:37i9dQZEVXcQMiQXJGIMRO"`);
  await runAppleScript(script);
  return;
}
