import {LaunchProps, showHUD} from "@raycast/api";
import {execSync} from "child_process";

interface AdbWriteArguments {
    text: string;
}


export default async function main(props: LaunchProps<{ arguments: AdbWriteArguments }>) {
    const adbDir = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`
    const text = props.arguments.text
    await showHUD("✍️ Writing " + text)
    execSync(`${adbDir} shell input text '${text}'`)
}