import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { sendToTethered } from "./send-to-tethered";

export async function runControl(path: string, title: string): Promise<void> {
  try {
    await sendToTethered(`tethered://control${path}`);
    await showHUD(`${title} requested; use Show Status to confirm`);
  } catch (error) {
    await showFailureToast(error, { title: `Could not send ${title}` });
  }
}
