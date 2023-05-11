import { closeMainWindow } from "@raycast/api";
import * as cache from "./utils/cache";

export default async function WipeCache() {
  closeMainWindow();

  cache.invalidateMessages();
  cache.invalidateAccounts();
}
