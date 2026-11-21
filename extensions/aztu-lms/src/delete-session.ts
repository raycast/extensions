import { LocalStorage, Toast, clearSearchBar, showToast } from "@raycast/api";
import { LAST_LMS_LOGIN_LINK_KEY, LAST_LMS_LOGIN_TIMESTAMP_KEY } from "./lib/constants";

// Saved by earlier versions of the extension.
const LEGACY_JWT_KEYS = ["aztu_jwt_token", "aztu_jwt_token_time"];

export default async function Command() {
  await Promise.all([
    LocalStorage.setItem(LAST_LMS_LOGIN_LINK_KEY, ""),
    LocalStorage.setItem(LAST_LMS_LOGIN_TIMESTAMP_KEY, ""),
    ...LEGACY_JWT_KEYS.map((key) => LocalStorage.removeItem(key)),
  ]);

  await showToast({ title: "Session deleted successfully", style: Toast.Style.Success });

  await clearSearchBar({ forceScrollToTop: true });
}
