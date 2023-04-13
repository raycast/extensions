import { exec } from "child_process";
import { showHUD } from "@raycast/api";

export default async function main() {
  exec('/Applications/Privileges.app/Contents/Resources/PrivilegesCLI --add');
  await showHUD("🔓 Granted priviliges");
}
