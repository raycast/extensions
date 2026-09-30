import { showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    const { stderr } = await runYabaiCommand(`-m space --create`);

    if (stderr) {
      throw new Error(stderr);
    }

    const { stdout: spacesOutput } = await runYabaiCommand(`-m query --spaces`);
    const spaces = JSON.parse(spacesOutput);
    const lastSpaceIndex = spaces.filter((space: { [x: string]: never }) => !space["is-native-fullscreen"]).pop().index;

    await runYabaiCommand(`-m space --focus ${lastSpaceIndex}`);

    showHUD(`Created space: ${lastSpaceIndex}`);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Yabai executable not found")) {
        return;
      }

      showFailureToast(error, {
        title: "Failed to create space",
      });
    } else {
      showFailureToast(error, {
        title: "Failed to create space",
      });
    }
  }
}
