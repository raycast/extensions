import { LaunchProps, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import checkAdbExists from "./utils";

interface AdbUrlArguments {
  url: string;
}

export default async function openUrl(props: LaunchProps<{ arguments: AdbUrlArguments }>) {
  const adbDir = await checkAdbExists();
  const url = props.arguments.url;
  await showHUD("️🌐 Opening " + url);
  execSync(`${adbDir} shell am start -a android.intent.action.VIEW -d  '${url}'`);
}
