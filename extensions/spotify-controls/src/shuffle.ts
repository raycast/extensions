import { showToast, ToastStyle } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  const script = `
    property shuffleEnabled : false
    tell application "Spotify"
      set shuffleEnabled to shuffling
      set shuffling to not shuffleEnabled
      return not shuffleEnabled
    end tell`;
  try {
    const result = await runAppleScript(script);
    await showToast(ToastStyle.Success, result === "true" ? "Shuffle On" : "Shuffle Off");
  } catch (_) {
    await showToast(ToastStyle.Failure, "Failed toggling shuffle");
  }
};
