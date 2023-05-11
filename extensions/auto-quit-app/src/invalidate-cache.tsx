import { closeMainWindow } from "@raycast/api";
import * as cache from "./utils/cache";

export default async function InvalidateCache() {
  closeMainWindow();

  cache.invalidateMessages();
  cache.invalidateAccounts();
}
