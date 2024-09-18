import { showToast, Toast } from "@raycast/api";
import { brewCleanup } from "./brew";
import { showActionToast, showFailureToast, wait } from "./utils";
import { preferences } from "./preferences";

export default async (): Promise<void> => {
  try {
    const abort = showActionToast({
      title: "Cleaning files & packages from the cache" + String.ellipsis,
      cancelable: true,
    });
    await brewCleanup(preferences.withoutThreshold, abort);
    showToast(Toast.Style.Success, "Cleaning completed");
  } catch (err) {
    await showFailureToast("Cleaning failed", err as Error);
    await wait(3000);
  }
};
