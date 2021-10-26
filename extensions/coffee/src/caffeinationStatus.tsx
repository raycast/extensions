import { showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";

const CaffeinateStatus = async () => {
  try {
    await runAppleScript(`do shell script "pgrep caffeinate"`);
    await showHUD("Your Mac is caffeinated");
  } catch (_) {
    await showHUD("Your Mac is decaffeinated");
  }
};

export default CaffeinateStatus;
