import { Clipboard, showToast, Toast } from "@raycast/api";
import { copyPinData } from "./lib/utils";

export default async function Command() {
  const data = await copyPinData();
  const text = await Clipboard.readText();
  if (text == data) {
    await showToast({ title: "Copied pin data to clipboard!" });
  } else {
    await showToast({ title: "Failed to copy pins to clipboard.", style: Toast.Style.Failure });
  }
}
