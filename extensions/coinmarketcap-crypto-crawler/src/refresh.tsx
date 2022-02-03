import { refreshExistingCacheAsync } from "./utils";
import { showToast, ToastStyle } from "@raycast/api";

export default async () => {
  try {
    await refreshExistingCacheAsync();

    await showToast(ToastStyle.Success, "Refreshed successfully");
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = (error as any)?.message;
    showToast(ToastStyle.Failure, "Refresh failed", message);
  }
};
