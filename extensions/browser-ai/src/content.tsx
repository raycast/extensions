import { Clipboard, Toast, showHUD, showToast } from "@raycast/api";
import { getBrowserContent } from "./lib/utils";

export default async function Command() {
  try {
    const _browserContent = await getBrowserContent({ format: "markdown" });
    await Clipboard.copy(_browserContent);
    console.log(_browserContent);
    await showHUD("Content copied to clipboard successfully");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to fetch and copy content");
  }
}
