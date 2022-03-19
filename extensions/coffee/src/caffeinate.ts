import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

const Caffeinate = async (args?: string) => {
  try {
    await runAppleScript(`do shell script "pgrep caffeinate"`);
    await showHUD("Your Mac is already caffeinated");
  } catch (_) {
    runAppleScript(`do shell script "caffeinate -di${args ? ` ${args}` : ""}"`);
    await showHUD("Your Mac is caffeinated");
  }
};

export default Caffeinate;
