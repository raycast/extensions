import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { checkAdbExists, delay, getAppIdFromParamsOrCache, saveAppIdInCache } from "./utils";
import Style = Toast.Style;

export default async function softKill(props: LaunchProps<{ arguments: { appId: string | undefined } }>) {
  let adbDir: string;
  try {
    adbDir = await checkAdbExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  const appId = getAppIdFromParamsOrCache(props.arguments.appId);
  if (appId === undefined || appId.trim().length == 0 || !appId.match(".*\\..*")) {
    await showToast(Style.Failure, `AppId "${appId}" doesn't match com.vendor format`);
    return;
  }
  saveAppIdInCache(appId);
  await showHUD(`✋ Putting ${appId} in background`);
  execSync(`${adbDir} shell input keyevent 3`);
  await delay(2000);
  await showHUD(`✋ Soft kill ${appId}`);
  execSync(`${adbDir} shell am kill ${appId}`);
}
