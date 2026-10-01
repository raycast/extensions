import { showHUD, showToast, Toast } from "@raycast/api";
import { sendToTethered } from "./send-to-tethered";

export async function runControl(path: string, title: string): Promise<void> {
  try {
    await sendToTethered(`tethered://control${path}`);
    await showHUD(`${title} sent to Tethered`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not send ${title}`,
      message: detail,
    });
  }
}
