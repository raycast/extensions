import { LaunchProps, showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { showFailureToast } from "@raycast/utils";

export default async function Command(args: LaunchProps) {
  const spaceIndex = parseInt(args.arguments.spaceIndex, 10);

  if (isNaN(spaceIndex)) {
    showHUD(`Invalid space index: ${args.arguments.spaceIndex}`);
    return;
  }

  try {
    const { stderr } = await runYabaiCommand(`-m space --focus ${spaceIndex}`);

    if (stderr) {
      throw new Error(stderr);
    }

    showHUD(`Focused space ${spaceIndex}`);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("already focused space")) {
        return;
      }

      showFailureToast(error, {
        title: "Failed to focus space",
      });

      return;
    }

    showFailureToast("Failed to focus space");
  }
}
