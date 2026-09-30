import { showHUD, showToast, Toast } from "@raycast/api";

export async function showBrightnessFeedback(message: string, closeRaycast: boolean): Promise<void> {
  if (closeRaycast) {
    await showHUD(message);
  } else {
    await showToast({ style: Toast.Style.Success, title: message });
  }
}
