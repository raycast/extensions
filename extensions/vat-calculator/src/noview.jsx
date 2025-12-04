import { Clipboard, showHUD, getPreferenceValues, closeMainWindow } from "@raycast/api";

import { numberWithVAT } from "./lib/vat";

export default async function quickVat(props) {
  var number = numberWithVAT(props.arguments.number);

  if (getPreferenceValues().autopaste) {
    closeMainWindow();
    Clipboard.paste(number);
    showHUD(`Pasted Result to Active App`);
  } else {
    Clipboard.copy(number);
    showHUD("Copied Answer to Clipboard");
  }
}
