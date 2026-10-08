import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { buildScriptEnsuringSpotifyIsRunning } from "./utils";

export default async () => {
  const script = buildScriptEnsuringSpotifyIsRunning(`
    set repeatEnabled to repeating
    set repeating to not repeatEnabled
    return not repeatEnabled
  `);
  try {
    const result = await runAppleScript(script);
    await showToast({
      title: result === "true" ? "Repeat On" : "Repeat Off",
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed toggling repeat",
    });
  }
};
