import { Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

import { numberWithVAT } from "./lib/vat";

export default async function quickVat(props) {
  var number = numberWithVAT(props.arguments.number);

  if (getPreferenceValues().autopaste) {
    showHUD(`Pasted Result to Active App`);
    await runAppleScript(`
        tell application "System Events"
            keystroke "${number}" 
        end tell
        `);
  } else {
    Clipboard.copy(number);
    showHUD("Copied Answer to Clipboard");
  }
}
