import { showToast, Toast } from "@raycast/api";
import { Bitwarden } from "~/api/bitwarden";
import { VAULT_LOCK_MESSAGES } from "~/constants/general";
import { SessionStorage } from "~/context/session/utils";

async function generatePasswordQuickCommand() {
  const toast = await showToast(Toast.Style.Animated, "Locking vault...", "Please wait");
  try {
    const [token] = await SessionStorage.getSavedSession();
    if (!token) {
      toast.style = Toast.Style.Failure;
      toast.title = "No session found";
      toast.message = "Already locked or not logged in";
      return;
    }

    const bitwarden = await new Bitwarden().initialize();
    await bitwarden.withSession(token).lock(VAULT_LOCK_MESSAGES.MANUAL);
    await SessionStorage.clearSession();

    toast.style = Toast.Style.Success;
    toast.title = "Vault successfully locked";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to lock vault";
  }
}

export default generatePasswordQuickCommand;
