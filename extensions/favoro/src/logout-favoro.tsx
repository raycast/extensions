import { showToast, Toast } from "@raycast/api";
import { logout } from "./lib/oauth";
import { clearCache } from "./lib/cache";
import { clearFavorites } from "./lib/favorites";

export default async function Command(): Promise<void> {
  try {
    await clearFavorites();
    await clearCache();
    await logout();
    await showToast({
      style: Toast.Style.Success,
      title: "Disconnected",
      message: "Successfully disconnected from FAVORO",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Disconnect Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
