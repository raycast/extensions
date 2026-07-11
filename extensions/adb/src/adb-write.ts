import { LaunchProps, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { checkAdbDeviceExists } from "./utils";

interface AdbWriteArguments {
  text: string;
}

export default async function writeText(props: LaunchProps<{ arguments: AdbWriteArguments }>) {
  let adbDir: string;
  try {
    adbDir = await checkAdbDeviceExists();
  } catch (e) {
    await showHUD(`${e}`);
    return;
  }
  const text = props.arguments.text;
  await showHUD("✍️ Writing " + text);
  execSync(`${adbDir} shell input text '${text}'`);
}
