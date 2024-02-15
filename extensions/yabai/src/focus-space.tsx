import { LaunchProps, showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";

export default async function Command(args: LaunchProps) {
  const spaceIndex = parseInt(args.arguments.spaceIndex, 10);
  if (isNaN(spaceIndex)) {
    showHUD(`Invalid space index: ${args.arguments.spaceIndex}`);
    return;
  }

  try {
    await runYabaiCommand(`-m space --focus ${spaceIndex}`);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("already focused space")) {
        return;
      }

      showHUD(`Error: ${error.message}`);
      return;
    }
    showHUD(`Error: ${error}`);
  }
}
