import { LaunchProps, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import checkAdbExists from "./utils";

interface AdbWriteArguments {
  text: string;
}

export default async function writeText(props: LaunchProps<{ arguments: AdbWriteArguments }>) {
  const adbDir = await checkAdbExists();
  const text = props.arguments.text;
  await showHUD("✍️ Writing " + text);
  execSync(`${adbDir} shell input text '${text}'`);
}
