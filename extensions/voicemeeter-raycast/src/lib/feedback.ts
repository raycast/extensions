import { showToast, Toast } from "@raycast/api";
import { ActionResult } from "./types";

export async function notifyAction(result: ActionResult): Promise<void> {
  if (result.ok) {
    await showToast({ style: Toast.Style.Success, title: result.message });
    return;
  }

  if (result.skipped) {
    await showToast({ style: Toast.Style.Failure, title: result.message });
    return;
  }

  await showToast({ style: Toast.Style.Failure, title: result.message });
}
