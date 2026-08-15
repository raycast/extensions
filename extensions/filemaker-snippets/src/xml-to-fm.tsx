import { showHUD, showToast, Toast, Clipboard } from "@raycast/api";
import { XMLToFMObjects } from "./utils/FmClipTools";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Converting from XML...",
  });

  try {
    const xml = await Clipboard.readText();
    if (!xml || xml.trim() === "") {
      toast.style = Toast.Style.Failure;
      toast.title = "No text in clipboard";
      return;
    }
    await XMLToFMObjects(xml);
    toast.hide();
    await showHUD("FileMaker objects ready to paste");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to convert XML to FileMaker objects";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
