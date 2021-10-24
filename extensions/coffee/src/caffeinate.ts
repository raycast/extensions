import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

const Caffeinate = async (pid?: string) => {
  try {
    await runAppleScript(`do shell script "pgrep caffeinate"`);
    await showHUD("Your Mac is already caffeinated");
  } catch (_) {
    runAppleScript(`do shell script "caffeinate -di${pid}"`);
    await showHUD("Your Mac is caffeinated");
  }
};

export default Caffeinate;
