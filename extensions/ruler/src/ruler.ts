import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { runRuler } from "./utils";

export default async function command() {
  await closeMainWindow();

  try {
    const getDistance = await runRuler();
    if (!getDistance) {
      return;
    }

    console.log(`Get distance: ${getDistance}`);
    await Clipboard.copy(getDistance);
    await showHUD("Copied distnace");
  } catch (e) {
    console.error(e);

    await showHUD("❌ Failed calculating distance");
  }
}
