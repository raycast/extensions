import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { brewCleanup } from "./brew";
import { showActionToast, showFailureToast, wait } from "./utils";

type Preference = {
  withoutThreshold: boolean;
};

export default async (): Promise<void> => {
  try {
    const abort = showActionToast({
      title: "Cleaning files & packages from the cache" + String.ellipsis,
      cancelable: true,
    });
    const preference = getPreferenceValues<Preference>();
    await brewCleanup(preference.withoutThreshold, abort);
    showToast(Toast.Style.Success, "Cleaning completed");
  } catch (err) {
    await showFailureToast("Cleaning failed", err as Error);
    await wait(3000);
  }
};
