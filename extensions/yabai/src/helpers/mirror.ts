import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runYabaiCommand } from "./scripts";

export async function mirror(axis: "x" | "y") {
  const cmd = `-m space --mirror ${axis}-axis`;

  try {
    const { stderr } = await runYabaiCommand(cmd);

    if (stderr) {
      throw new Error(stderr);
    }

    showHUD(`Mirrored space in the ${axis} axis`);
  } catch (error) {
    showFailureToast(error, {
      title: `Failed to mirror space in the ${axis} axis. Make sure Yabai is installed and running.`,
    });
  }
}
