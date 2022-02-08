import { showToast, ToastStyle } from "@raycast/api";
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
    await showToast(ToastStyle.Success, result === "true" ? "Repeat On" : "Repeat Off");
  } catch (_) {
    await showToast(ToastStyle.Failure, "Failed toggling repeat");
  }
};
