import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { checkAdbExists, getAppIdFromParamsOrCache, saveAppIdInCache } from "./utils";
import Style = Toast.Style;

export default async function clearAppData(props: LaunchProps<{ arguments: { appId: string | undefined } }>) {
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
  await showHUD(`🧹 Clear app data for ${appId}`);
  execSync(`${adbDir} shell pm clear ${appId}`);
}
