import { closeMainWindow } from "@raycast/api";

import { Cache } from "./utils/cache";

export default async function ClearCache() {
  closeMainWindow();

  Cache.invalidateMessages();
  Cache.invalidateAccounts();
}
