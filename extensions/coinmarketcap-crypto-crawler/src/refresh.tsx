import { refreshExistingCacheAsync } from "./utils";
import { showToast, Toast } from "@raycast/api";

export default async () => {
  try {
    await refreshExistingCacheAsync();

    await showToast(Toast.Style.Success, "Refreshed successfully");
  } catch (error) {
    showToast(Toast.Style.Failure, "Refresh failed", (error as Error)?.message);
  }
};
