import apiServer from "./utils/api";
import { showToast, Toast } from "@raycast/api";
export default async function Command() {
  showToast(Toast.Style.Animated, "Refreshing all feeds...");
  await apiServer.refreshAllFeed();
  showToast(Toast.Style.Success, "Feeds have been refreshed");
}
