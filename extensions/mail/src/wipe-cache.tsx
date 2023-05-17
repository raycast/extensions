import { closeMainWindow } from "@raycast/api";

import { Cache } from "./utils/cache";

export default async function WipeCache() {
  closeMainWindow();

  Cache.invalidateMessages();
  Cache.invalidateAccounts();
}
