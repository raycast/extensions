import { showToast, Toast } from "@raycast/api";
import { brewUpgradeAll } from "./brew";
import { preferences } from "./preferences";
import { showActionToast, showFailureToast, wait } from "./utils";

export default async (): Promise<void> => {
  try {
    const abort = showActionToast({ title: "Upgrading formula & casks" + String.ellipsis, cancelable: true });
    await brewUpgradeAll(preferences.greedyUpgrades, abort);
    showToast(Toast.Style.Success, "Upgrade completed");
  } catch (err) {
    await showFailureToast("Upgrade failed", err as Error);
    await wait(3000);
  }
};
