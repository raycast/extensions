import { runAppleScript } from "@raycast/utils";
import { buildScriptEnsuringSpotifyIsRunning } from "./helpers/applescript";

export default async function Command() {
  const script = buildScriptEnsuringSpotifyIsRunning(`play track "spotify:playlist:37i9dQZEVXcQMiQXJGIMRO"`);

  await runAppleScript(script);
}
