import { Toast, clearSearchBar, showToast } from "@raycast/api";
import { clearLoginState } from "./lib/login";

export default async function Command() {
  await clearLoginState();

  await showToast({ title: "Session deleted successfully", style: Toast.Style.Success });

  await clearSearchBar({ forceScrollToTop: true });
}
