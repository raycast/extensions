import { showHUD, showToast, Toast } from "@raycast/api";
import { ensureLunarReady, adjustCursorBrightness } from "./utils/lunar";

export default async function Command() {
  if (!(await ensureLunarReady())) return;

  try {
    const { name, brightness } = await adjustCursorBrightness(+10);
    await showHUD(`${name}: ${brightness}%`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to increase brightness",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
