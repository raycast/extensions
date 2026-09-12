import { closeMainWindow, showToast, Toast } from "@raycast/api";

import { Cache } from "./utils/cache";

export default async function ClearCache() {
  await closeMainWindow();

  await showToast(Toast.Style.Animated, "Clearing cache");

  Cache.invalidateMessages();
  Cache.invalidateAccounts();

  await showToast(Toast.Style.Success, "All mails and accounts cleared from cache");
}
