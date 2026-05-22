import { Toast, showToast } from "@raycast/api";
import { assertAppReady, stopCurrentTask } from "./lib/sp-client";
import { getErrorMessage } from "./lib/sp-errors";

export default async function Command() {
  try {
    await assertAppReady();
    await stopCurrentTask();
    await showToast({
      style: Toast.Style.Success,
      title: "Current task stopped",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not stop current task",
      message: getErrorMessage(error),
    });
  }
}
