import { environment, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "path";
import { runViewer } from "swift:../swift/HotkeysViewer";

export default async function Command() {
  try {
    const htmlPath = path.join(environment.assetsPath, "raycast-hotkeys.html");
    await showHUD("Opening Raycast Hotkeys Map");
    await runViewer(htmlPath);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to open Hotkeys Map" });
  }
}
