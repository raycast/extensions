import { showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    const { stdout: rawRecentSpace, stderr } = await runYabaiCommand(`-m query --spaces --space recent`);

    if (stderr) {
      throw new Error(stderr);
    }

    const recentSpace = JSON.parse(rawRecentSpace);
    const lastSpaceIndex = recentSpace.index;

    await runYabaiCommand(`-m space --destroy`);

    try {
      await runYabaiCommand(`-m space --focus ${lastSpaceIndex}`);
    } catch (error) {
      throw new Error(`Failed to focus space: ${error}`);
    }

    await showHUD(`Destroyed Space`);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Yabai executable not found")) {
        return;
      }

      showFailureToast(error, {
        title: "Failed to destroy space",
      });
    } else {
      showFailureToast(error, {
        title: "Failed to destroy space",
      });
    }
  }
}
