import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { checkAdbDeviceExists } from "./utils";
import Style = Toast.Style;

interface AdbUrlArguments {
  url: string;
}

export default async function openUrl(props: LaunchProps<{ arguments: AdbUrlArguments }>) {
  let adbDir: string;
  try {
    adbDir = await checkAdbDeviceExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  const url = props.arguments.url;

  if (!url.match("(.*):\\/\\/")) {
    await showToast(Style.Failure, "URL must match yourapp:// or http(s)://");
    return;
  }

  await showHUD("️🌐 Opening " + url);
  const escapedUrl = `'"${url}"'`;
  execSync(`${adbDir} shell am start -a android.intent.action.VIEW -d ${escapedUrl}`);
}
