import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { requestControl } from "./control-request";
import { readStoredData } from "./read-stored-items";
import { isTetheredRunning, sendToTethered } from "./send-to-tethered";

export async function runControl(path: string, title: string): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title });
  try {
    const message = await requestControl(path, {
      isRunning: isTetheredRunning,
      requestID: () => crypto.randomUUID(),
      send: sendToTethered,
      readResponses: () => readStoredData("raycastControlResponses"),
      now: Date.now,
      sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    });
    toast.style = Toast.Style.Success;
    toast.title = title;
    toast.message = message;
  } catch (error) {
    await toast.hide();
    await showFailureToast(error, { title: `Could not complete ${title}` });
  }
}
