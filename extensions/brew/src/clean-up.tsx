import { showToast, Toast } from "@raycast/api";
import { brewCleanup } from "./utils/brew";
import { showActionToast, showFailureToast, wait, ensureError } from "./utils";
import { preferences } from "./utils";

export default async (): Promise<void> => {
  try {
    const handle = showActionToast({
      title: "Cleaning files & packages from the cache" + String.ellipsis,
      cancelable: true,
    });
    await brewCleanup(preferences.withoutThreshold, handle.abort?.signal);
    showToast(Toast.Style.Success, "Cleaning completed");
  } catch (err) {
    await showFailureToast("Cleaning failed", ensureError(err));
    await wait(3000);
  }
};
