import { showHUD, Clipboard, getPreferenceValues } from "@raycast/api";
import randomPhone from "random-phone";

const { defaultAction: action, includeAreaCode } = getPreferenceValues();

export default async function main() {
  let number = randomPhone();
  if (!includeAreaCode) number = number.slice(2);
  if (action === "copy") {
    await Clipboard.copy(number);
    await showHUD("Copied Number to Clipboard");
  } else {
    await Clipboard.paste(number);
  }
}
