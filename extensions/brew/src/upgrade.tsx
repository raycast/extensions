import { showToast, Toast } from "@raycast/api";
import { brewUpgradeAll } from "./utils/brew";
import { preferences } from "./preferences";
import { showActionToast, showFailureToast, wait } from "./utils";

export default async (): Promise<void> => {
  try {
    const handle = showActionToast({ title: "Upgrading formulae & casks" + String.ellipsis, cancelable: true });
    await brewUpgradeAll(preferences.greedyUpgrades, handle.abort);
    showToast(Toast.Style.Success, "Upgrade completed");
  } catch (err) {
    await showFailureToast("Upgrade failed", err as Error);
    await wait(3000);
  }
};
