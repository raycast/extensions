import { LaunchProps, showHUD } from "@raycast/api";
import { startTimer } from "./Timers";

export default async function Command(options: LaunchProps<{ arguments: Arguments.StartTimer }>) {
  let name = options.arguments.name;
  if (name?.trim().length === 0) {
    name = "Unnamed timer";
  }
  const timer = await startTimer(name, options.arguments.tag);

  if (timer === null) {
    await showHUD("Starting timer...");
    return;
  }

  await showHUD(`Started ${timer.name}`);
}
