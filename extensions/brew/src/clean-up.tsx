import { showToast, Toast } from "@raycast/api";
import { brewCleanup } from "./utils/brew";
import { showActionToast, showBrewFailureToast, wait, ensureError } from "./utils";
import { preferences } from "./utils";

export default async (): Promise<void> => {
  try {
    const handle = showActionToast({
      title: "Cleaning files & packages from the cache" + String.ellipsis,
      cancelable: true,
    });
    await brewCleanup(preferences.withoutThreshold, handle.abort?.signal);
    await showToast({ style: Toast.Style.Success, title: "Cleaning completed" });
  } catch (err) {
    await showBrewFailureToast("Cleaning failed", ensureError(err));
    await wait(3000);
  }
};
