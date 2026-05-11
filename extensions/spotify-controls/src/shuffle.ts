import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { buildScriptEnsuringSpotifyIsRunning } from "./utils";

export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning(`
    set shuffleEnabled to shuffling
    set shuffling to not shuffleEnabled
    return not shuffleEnabled
  `);
  try {
    const result = await runAppleScript(script);
    await showToast({
      title: result === "true" ? "Shuffle On" : "Shuffle Off",
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed toggling shuffle",
    });
  }
};
