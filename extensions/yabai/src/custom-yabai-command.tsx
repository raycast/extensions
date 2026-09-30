import { LaunchProps } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { showFailureToast } from "@raycast/utils";

const prefixesToRemove = ["yabai -m", "yabai --message", "-m", "--message"];

export default async function Command(launchProps: LaunchProps) {
  try {
    let command = launchProps.arguments.command.trim().replace(/\s\s+/g, " ");

    for (const prefix of prefixesToRemove) {
      if (command.startsWith(prefix)) {
        command = command.replace(prefix, "").trim();
      }
    }

    if (!command) {
      showFailureToast("No command provided.");
      return;
    }

    command = `-m ${command}`;

    const { stderr } = await runYabaiCommand(command);
    if (stderr) {
      throw new Error(stderr);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Yabai executable not found")) {
      return;
    }

    showFailureToast(error);
  }
}
