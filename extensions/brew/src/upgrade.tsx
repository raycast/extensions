import { showToast, ToastStyle } from "@raycast/api";
import { brewUpgradeCommand } from "./brew";
import { preferences } from "./preferences";
import { showActionToast, showFailureToast } from "./utils";

export default async (): Promise<void> => {
  try {
    const abort = showActionToast({ title: "Upgrading formula & casks" + String.ellipsis, cancelable: true });
    await brewUpgradeCommand(preferences.greedyUpgrades, true, abort);
    showToast(ToastStyle.Success, "Upgrade completed");
  } catch (err) {
    await showFailureToast("Upgrade failed", err as Error);
    // Wait around until user has had chance to click the Toast action.
    // Note this only works for "no view" commands (actions still break when popping a view based command).
    // See: https://raycastapp.slack.com/archives/C01E6LWGXJ8/p1642676284027700
    await wait(3000);
  }
};

async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
