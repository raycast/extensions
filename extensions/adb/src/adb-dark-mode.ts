import { LaunchProps, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import checkAdbExists from "./utils";

interface AdbDarkModeArguments {
  toggle: string;
}

export default async function darkMode(props: LaunchProps<{ arguments: AdbDarkModeArguments }>) {
  const adbDir = await checkAdbExists();
  const auto = props.arguments.toggle === "auto" || props.arguments.toggle === "a";
  const disable = props.arguments.toggle === "disable" || props.arguments.toggle === "d";
  const enable = props.arguments.toggle === "enable" || props.arguments.toggle === "e";
  let toggleValue;
  if (enable) {
    toggleValue = "yes";
    await showHUD("🌗 Turning on dark-mode");
  } else if (disable) {
    toggleValue = "no";
    await showHUD("🌗 Turning off dark-mode");
  } else if (auto) {
    toggleValue = "auto";
    await showHUD("🌗 Setting auto dark-mode");
  }
  execSync(`${adbDir} shell "cmd uimode night ${toggleValue}"`);
}
