import { showHUD } from "@raycast/api";
import { clearIfStillSecret } from "./lib/clipboard";
import { t } from "./lib/text";
import { lockSession } from "./lib/session";

/** Lock Passig: deletes the stored keys and clears the clipboard if it still holds a copied secret. */
export default async function LockCommand() {
  await lockSession();
  await clearIfStillSecret(true);
  await showHUD(t("common.locked"));
}
