import { LaunchProps, showHUD } from "@raycast/api";
import { calliday } from "./lib/cli";

export default async function StartTimer(props: LaunchProps<{ arguments: Arguments.StartTimer }>) {
  try {
    await calliday(["timer", "start", props.arguments.name]);
    await showHUD(`⏱ Timer started: ${props.arguments.name}`);
  } catch (error) {
    await showHUD(`Couldn't start the timer: ${(error as Error).message}`);
  }
}
