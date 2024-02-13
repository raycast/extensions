import { showHUD } from "@raycast/api";
import { execSync } from "child_process";
import checkAdbExists from "./utils";

export default async function wifi() {
  const adbDir = await checkAdbExists();
  const enabled = execSync(`${adbDir} shell settings get global wifi_on`).toString().trim() === "true";
  if (enabled) {
    await showHUD("🛜 Turning off wifi");
  } else {
    await showHUD("🛜 Turning on wifi");
  }
  execSync(`${adbDir} shell svc wifi ${!enabled}`);
}
