import { showHUD, showToast, Toast, Clipboard } from "@raycast/api";
import { FMObjectsToXML } from "./utils/FmClipTools";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Converting to XML...",
  });

  try {
    const xml = await FMObjectsToXML();
    await Clipboard.copy(xml);
    toast.hide();
    await showHUD("XML copied to clipboard");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to convert FileMaker objects to XML";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
