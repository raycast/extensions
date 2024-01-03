import { showHUD } from "@raycast/api";
import execute from "./execute";

export default async function main() {
    await execute('/usr/sbin/networksetup -setairportpower en0 on');
    await showHUD("Turned on WIFI", { clearRootSearch: true });
}
