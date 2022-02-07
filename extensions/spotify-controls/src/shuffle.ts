import { showToast, ToastStyle } from "@raycast/api";
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
    await showToast(ToastStyle.Success, result === "true" ? "Shuffle On" : "Shuffle Off");
  } catch (_) {
    await showToast(ToastStyle.Failure, "Failed toggling shuffle");
  }
};
