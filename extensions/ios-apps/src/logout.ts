import { showHUD, showToast, Toast } from "@raycast/api";
import { revoke, getAuthInfo } from "./utils/ipatool-auth";
import { validateIpatoolInstallation } from "./utils/ipatool-validator";
import { clearStoredCredentials } from "./utils/auth";
import { logger } from "./utils/logger";

export default async function Command() {
  try {
    await showHUD("Logging out…");
    // Only attempt ipatool revoke if it looks installed/usable
    const ipatoolAvailable = await validateIpatoolInstallation();
    if (ipatoolAvailable) {
      try {
        await revoke();
      } catch (e) {
        // Even if revoke fails, proceed to clear local credentials for safety
        const msg = e instanceof Error ? e.message : String(e);
        logger.error("Failed to revoke ipatool auth", { error: msg });
      }
    } else {
      logger.log("Skipping ipatool revoke because ipatool is not available");
    }

    await clearStoredCredentials();

    // Verify auth status post-logout when ipatool is available
    if (ipatoolAvailable) {
      try {
        const info = await getAuthInfo();
        if (info.authenticated) {
          await showToast({
            style: Toast.Style.Animated,
            title: "Logged out locally",
            message: "ipatool session may still be active",
          });
          return;
        }
      } catch (e) {
        // If verification fails, fall through to generic success toast
        logger.log("Auth verification after logout failed", e);
      }
    }

    await showToast({ style: Toast.Style.Success, title: "Logged out", message: "Credentials cleared" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Logout failed", { error: message });
    await showToast({ style: Toast.Style.Failure, title: "Logout failed", message });
  }
}
