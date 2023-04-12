import { showHUD } from "@raycast/api";
import { exec } from "child_process";

export default async function main() {
  exec('/Applications/Privileges.app/Contents/Resources/PrivilegesCLI --add');
  await showHUD("🔓 Granted priviliges");
}
