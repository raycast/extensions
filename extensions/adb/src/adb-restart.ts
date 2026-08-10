import { showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { checkAdbExists } from "./utils";

export default async function animationScale() {
  let adbDir: string;
  try {
    adbDir = await checkAdbExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  await showHUD(`🔁 Restarting ADB`);
  execSync(`${adbDir} kill-server && ${adbDir} start-server`);
}
