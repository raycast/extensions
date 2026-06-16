import { open, showHUD } from "@raycast/api";
import { isThawInstalled, THAW_INSTALL_URL } from "./checkInstall";
import { showError } from "./error";

export const openThawUrl = async (url: string, successMessage: string) => {
  try {
    // For readability
    const isInstalled = await isThawInstalled();
    if (!isInstalled) {
      await showHUD(`Thaw is not installed. Get it at: ${THAW_INSTALL_URL}`);
      return;
    }
    await open(`thaw://${url}`);
    await showHUD(successMessage);
  } catch (error) {
    await showError(error);
  }
};
