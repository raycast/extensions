import { showHUD } from "@raycast/api";
import execute from "./execute";

export default async function main() {
  await execute('/usr/sbin/networksetup -setairportpower en0 off');
  await showHUD("Turned off WIFI", { clearRootSearch: true });
}
