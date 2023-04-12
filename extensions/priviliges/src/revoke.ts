import { showHUD } from "@raycast/api";
const {exec} = require('child_process');

export default async function main() {
  exec('/Applications/Privileges.app/Contents/Resources/PrivilegesCLI --remove');
  await showHUD("🔒 Revoked priviliges");
}
