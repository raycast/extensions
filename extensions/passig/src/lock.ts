import { showHUD } from "@raycast/api";
import { clearIfStillSecret } from "./lib/clipboard";
import { lockSession } from "./lib/session";

/** Blocca Passig: cancella le chiavi in cache e svuota gli appunti se contengono un segreto copiato. */
export default async function LockCommand() {
  lockSession();
  await clearIfStillSecret(true);
  await showHUD("Passig bloccato");
}
