import { showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";

export default async function Command() {
  try {
    await runYabaiCommand(`-m space --create`);

    const { stdout: spacesOutput } = await runYabaiCommand(`-m query --spaces`);
    const spaces = JSON.parse(spacesOutput);
    const lastSpaceIndex = spaces.filter((space: { [x: string]: never }) => !space["is-native-fullscreen"]).pop().index;

    await runYabaiCommand(`-m space --focus ${lastSpaceIndex}`);

    showHUD(`Created space: ${lastSpaceIndex}`);
  } catch (error) {
    if (error instanceof Error) {
      showHUD(`Error: ${error.message}`);
    } else {
      showHUD(`Error: ${error}`);
    }
  }
}
