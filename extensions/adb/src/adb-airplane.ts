import { LaunchProps, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import checkAdbExists from "./utils";

interface AdbAirplaneArguments {
  toggle: string;
}

export default async function airplane(props: LaunchProps<{ arguments: AdbAirplaneArguments }>) {
  const adbDir = await checkAdbExists();
  const enable = props.arguments.toggle === "enable" || props.arguments.toggle === "e";
  let toggleValue;
  if (enable) {
    toggleValue = "enable";
    await showHUD("✈️ Turning on airplane mode");
  } else {
    toggleValue = "disable";
    await showHUD("✈️ Turning off airplane mode");
  }
  execSync(`${adbDir} shell cmd connectivity airplane-mode ${toggleValue}`);
}
