import { refreshExistingCacheAsync } from "./utils";
import { showToast, ToastStyle } from "@raycast/api";

export default async () => {
  try {
    await refreshExistingCacheAsync();

    await showToast(ToastStyle.Success, "Refreshed successfully");
  } catch (error) {
    console.error(error);
    await showToast(ToastStyle.Failure, "Refresh failed");
  }
};
