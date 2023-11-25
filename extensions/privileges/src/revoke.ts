import { showHUD } from "@raycast/api";
import { getPrivilegesClient, showInstallToast } from "./utils";

export default async function main() {
  const privileges = await getPrivilegesClient();
  if (!privileges) {
    await showInstallToast();
    return;
  }
  await privileges.revoke();
  await showHUD("🔒 Privileges revoked");
}
