import { Alert, Icon, confirmAlert, showToast, Toast } from "@raycast/api";
import { ExecaError } from "execa";
import { Bitwarden } from "~/api/bitwarden";
import { SessionStorage } from "~/context/session/utils";
import { Cache } from "~/utils/cache";

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
      await new Bitwarden().logout();
      await SessionStorage.logoutClearSession();
      Cache.clear();

      toast.title = "Successfully logged out";
      toast.style = Toast.Style.Success;
    }
  } catch (error) {
    const execaError = error as ExecaError;
    if (execaError.stderr.toLowerCase().includes("not logged in")) {
      await showToast(Toast.Style.Failure, "No session found", "You are not logged in");
      return;
    }

    await showToast(Toast.Style.Failure, "Failed to logout from vault");
  }
}

export default logoutVaultCommand;
