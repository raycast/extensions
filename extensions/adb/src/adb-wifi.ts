import { LaunchProps, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import checkAdbExists from "./utils";

interface AdbWifiArguments {
  toggle: string;
}

export default async function wifi(props: LaunchProps<{ arguments: AdbWifiArguments }>) {
  const adbDir = await checkAdbExists();
  const enable = props.arguments.toggle === "enable" || props.arguments.toggle === "e";
  let toggleValue;
  if (enable) {
    toggleValue = "enable";
    await showHUD("🛜 Turning on wifi");
  } else {
    toggleValue = "disable";
    await showHUD("🛜 Turning off wifi");
  }
  execSync(`${adbDir} shell svc wifi ${toggleValue}`);
}
