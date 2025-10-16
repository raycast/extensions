import { setTimeout } from "node:timers/promises";
import { showHUD } from "@raycast/api";
import { getPrivilegesClient, showInstallToast } from "./utils";

export default async function main() {
  const privileges = await getPrivilegesClient();
  if (!privileges) {
    await showInstallToast();
    return;
  }
  await privileges.grant();
  await showHUD("🔓 Granting privileges for 1 minute…");
  await setTimeout(60000);
  await privileges.revoke();
  await showHUD("🔒 Privileges revoked");
}
