import { Clipboard, showHUD, getPreferenceValues, closeMainWindow } from "@raycast/api";

import { getNetPrice } from "./lib/vat";

export default async function quickVat(props) {
  var number = getNetPrice(props.arguments.number);

  if (getPreferenceValues().autopaste) {
    closeMainWindow();
    Clipboard.paste(number);
    showHUD(`Pasted Result to Active App`);
  } else {
    Clipboard.copy(number);
    showHUD("Copied Answer to Clipboard");
  }
}
