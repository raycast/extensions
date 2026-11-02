import { Clipboard, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { checkAdbDeviceExists } from "./utils";

export default async function currentActivity() {
  let adbDir: string;
  try {
    adbDir = await checkAdbDeviceExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  const cmdResult = execSync(`${adbDir} shell "dumpsys window | grep mCurrentFocus"`).toString();
  let result;
  try {
    result = cmdResult.split("/")[1].split("}")[0];
  } catch {
    result = cmdResult;
  }
  await Clipboard.copy({
    text: result,
  });
  await showHUD("✅ Current Activity: " + result);
}
