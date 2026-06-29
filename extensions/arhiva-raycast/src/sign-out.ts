import { showHUD } from "@raycast/api";

import { clearStoredSession } from "./lib/storage";

export default async function Command() {
  await clearStoredSession();
  await showHUD("Signed out of arhiva");
}
