import { LaunchType, launchCommand, showToast, Toast } from "@raycast/api";

type LaunchContext = Parameters<typeof launchCommand>[0]["context"];

export async function launchLocalAiCommand(target: {
  name: string;
  title: string;
  context?: LaunchContext;
}): Promise<void> {
  try {
    await launchCommand({ name: target.name, type: LaunchType.UserInitiated, context: target.context });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not open ${target.title}`,
      message: "Check that the command is enabled in Raycast Settings, Extensions, Local AI",
    });
  }
}
