import { LaunchProps, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { checkAdbDeviceExists } from "./utils";

interface AdbFontSizeArguments {
  factor: string;
}

export default async function fontSize(props: LaunchProps<{ arguments: AdbFontSizeArguments }>) {
  let adbDir: string;
  try {
    adbDir = await checkAdbDeviceExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  const factor = props.arguments.factor;
  await showHUD(`🔎 Setting font size to ${factor}`);
  execSync(`${adbDir} shell settings put system font_scale ${factor}`);
}
