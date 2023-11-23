import { showToast, Toast } from "@raycast/api";
import { Bitwarden } from "~/api/bitwarden";
import { VAULT_LOCK_MESSAGES } from "~/constants/general";
import { SessionStorage } from "~/context/session/utils";

async function lockVaultCommand() {
  try {
    await showToast(Toast.Style.Animated, "Locking vault...", "Please wait");
    const [token] = await SessionStorage.getSavedSession();
    if (!token) {
      await showToast(Toast.Style.Failure, "No session found", "Already locked or not logged in");
      return;
    }

    const bitwarden = await new Bitwarden().initialize();
    await bitwarden.withSession(token).lock(VAULT_LOCK_MESSAGES.MANUAL);
    await SessionStorage.clearSession();

    await showToast(Toast.Style.Success, "Vault successfully locked");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to lock vault");
  }
}

export default lockVaultCommand;
