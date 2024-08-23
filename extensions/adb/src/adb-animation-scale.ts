import { LaunchProps, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { checkAdbDeviceExists } from "./utils";

interface AdbAnimationScaleArguments {
  factor: string;
}

export default async function animationScale(props: LaunchProps<{ arguments: AdbAnimationScaleArguments }>) {
  let adbDir: string;
  try {
    adbDir = await checkAdbDeviceExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  const factor = props.arguments.factor;
  await showHUD(`🎥 Setting animation scale to ${factor}`);
  execSync(`${adbDir} shell settings put global window_animation_scale ${factor}`);
}
