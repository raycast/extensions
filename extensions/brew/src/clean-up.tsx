import { showToast, Toast } from "@raycast/api";
import { brewCleanup } from "./brew";
import { showActionToast, showFailureToast, wait } from "./utils";

export default async (): Promise<void> => {
  try {
    const abort = showActionToast({ title: "Cleaning up everything at once" + String.ellipsis, cancelable: true });
    await brewCleanup(abort);
    showToast(Toast.Style.Success, "Cleaning completed");
  } catch (err) {
    await showFailureToast("Cleaning failed", err as Error);
    // Wait around until user has had chance to click the Toast action.
    // Note this only works for "no view" commands (actions still break when popping a view based command).
    // See: https://raycastapp.slack.com/archives/C01E6LWGXJ8/p1642676284027700
    await wait(3000);
  }
};
