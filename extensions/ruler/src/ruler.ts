import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { runRuler } from "./utils";

export default async function command() {
  await closeMainWindow();

  try {
    const getDistance = await runRuler();
    if (!getDistance) {
      return;
    }

    await Clipboard.copy(getDistance);
    await showHUD("Copied distance");
  } catch (e) {
    await showHUD("❌ Failed calculating distance");
  }
}
