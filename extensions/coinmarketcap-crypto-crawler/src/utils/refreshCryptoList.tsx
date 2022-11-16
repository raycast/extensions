import { refreshExistingCacheAsync } from ".";
import { showToast, ToastStyle } from "@raycast/api";

export default async () => {
  try {
    await refreshExistingCacheAsync();

    await showToast(ToastStyle.Success, "Refreshed successfully");
  } catch (error) {
    showToast(ToastStyle.Failure, "Refresh failed", (error as Error)?.message);
  }
};
