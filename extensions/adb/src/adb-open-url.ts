import { LaunchProps, showHUD } from "@raycast/api";
import { execSync } from "child_process";

interface AdbUrlArguments {
  url: string;
}

export default async function openUrl(props: LaunchProps<{ arguments: AdbUrlArguments }>) {
  const adbDir = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`;
  const url = props.arguments.url;
  await showHUD("️🌐 Opening " + url);
  execSync(`${adbDir} shell am start -a android.intent.action.VIEW -d  '${url}'`);
}
