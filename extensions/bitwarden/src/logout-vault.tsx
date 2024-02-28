import { Alert, Icon, confirmAlert, showToast, Toast } from "@raycast/api";
import { Bitwarden } from "~/api/bitwarden";
import { SessionStorage } from "~/context/session/utils";
import { Cache } from "~/utils/cache";
import { NotLoggedInError } from "~/utils/errors";

async function logoutVaultCommand() {
  try {
    const hasConfirmed = await confirmAlert({
      title: "Logout From Bitwarden Vault",
      message: "Are you sure you want to logout from your current vault account?",
      icon: Icon.Logout,
      primaryAction: { title: "Confirm", style: Alert.ActionStyle.Destructive },
    });

    if (hasConfirmed) {
      const toast = await showToast(Toast.Style.Animated, "Logging out...");
      const bitwarden = await new Bitwarden(toast).initialize();
      const { error } = await bitwarden.logout();

      if (error instanceof NotLoggedInError) {
        toast.style = Toast.Style.Failure;
        toast.title = "No session found";
        toast.message = "You are not logged in";
        return;
      }

      await SessionStorage.logoutClearSession();
      Cache.clear();

      toast.title = "Successfully logged out";
      toast.style = Toast.Style.Success;
    }
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to logout from vault");
  }
}

export default logoutVaultCommand;
