import { Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { shutdownVirtualServer } from "./api";
import { CONFIRM_BEFORE_ACTIONS } from "./constants";

export default async function ShutdownVirtualServer() {
  if (CONFIRM_BEFORE_ACTIONS) {
    if (
      await confirmAlert({
        title: `Shut Down Virtual Server?`,
        icon: Icon.Power,
      })
    ) {
      const response = await shutdownVirtualServer();
      if (response.status === "success") {
        await showToast(Toast.Style.Success, "SUCCESS", "Shut Down");
      }
    }
  } else {
    const response = await shutdownVirtualServer();
    if (response.status === "success") {
      await showToast(Toast.Style.Success, "SUCCESS", "Shut Down");
    }
  }
}
