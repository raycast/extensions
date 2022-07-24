import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  const script = `
    tell application "Music"
      set currentState to get song repeat
      if currentState is equal to one or currentState is equal to none then
        set song repeat to all
        return "all"
      else 
        set song repeat to one
        return "one"
      end if
    end tell
    `;
  try {
    let state = await runAppleScript(script);
    state = state[0].toUpperCase() + state.slice(1);
    showToast(Toast.Style.Success, `Set Song Repeat to ${state}`);
  } catch {
    showToast(Toast.Style.Failure, `Error Setting Song Repeat`);
  }
};
