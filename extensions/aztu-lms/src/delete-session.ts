import { LocalStorage, Toast, clearSearchBar, showToast } from "@raycast/api";
import { JWT_TOKEN_STORAGE_KEY, LAST_LMS_LOGIN_LINK_KEY, LAST_LMS_LOGIN_TIMESTAMP_KEY } from "./lib/constants";

export default async function Command() {
  await Promise.all([
    LocalStorage.setItem(LAST_LMS_LOGIN_LINK_KEY, ""),
    LocalStorage.setItem(JWT_TOKEN_STORAGE_KEY, ""),
    LocalStorage.setItem(LAST_LMS_LOGIN_TIMESTAMP_KEY, ""),
  ]);

  await showToast({ title: "Session deleted successfully", style: Toast.Style.Success });

  await clearSearchBar({ forceScrollToTop: true });
}
