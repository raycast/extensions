import { showHUD } from "@raycast/api";
import { exec } from "child_process";

export default async function main() {
  exec('/Applications/Privileges.app/Contents/Resources/PrivilegesCLI --remove');
  await showHUD("🔒 Revoked priviliges");
}
