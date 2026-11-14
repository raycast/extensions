import { launchCommand, LaunchProps, LaunchType, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getSavedCommands } from "./storage";
import { runInTerminal } from "./terminal";

export default async function Command(props: LaunchProps<{ launchContext?: { id?: string } }>) {
  const id = props.launchContext?.id;
  if (!id) {
    try {
      await launchCommand({ name: "commands", type: LaunchType.UserInitiated });
    } catch (error) {
      await showFailureToast(error, { title: "Could not open My Commands" });
    }
    return;
  }

  const savedCommand = (await getSavedCommands()).find((savedCommand) => savedCommand.id === id);
  if (!savedCommand) {
    await showHUD("Command not found");
    return;
  }

  try {
    await runInTerminal(savedCommand.command);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open Terminal" });
  }
}
