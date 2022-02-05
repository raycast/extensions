import { showToast, ToastStyle } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  const script = `
    property repeatEnabled : false
    tell application "Spotify"
      set repeatEnabled to repeating
      set repeating to not repeatEnabled
      return not repeatEnabled
    end tell`;
  try {
    const result = await runAppleScript(script);
    await showToast(ToastStyle.Success, result === "true" ? "Repeat On" : "Repeat Off");
  } catch (_) {
    await showToast(ToastStyle.Failure, "Failed toggling repeat");
  }
};
