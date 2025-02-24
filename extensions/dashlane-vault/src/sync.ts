import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { syncVault } from "@/lib/dcli";
import { DisplayableError } from "./helper/error";

export default async function sync() {
  try {
    const toast = await showToast({
      title: "Syncing with Dashlane",
      style: Toast.Style.Animated,
    });

    await syncVault();

    toast.style = Toast.Style.Success;
    toast.title = "Sync with Dashlane succeeded";
  } catch (error) {
    showFailureToast(
      error,
      error instanceof DisplayableError
        ? {
            primaryAction: error.action,
          }
        : undefined,
    );
  }
}
