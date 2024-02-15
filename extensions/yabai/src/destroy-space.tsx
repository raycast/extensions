import { showHUD } from "@raycast/api";
import { runYabaiCommand } from "./helpers/scripts";

export default async function Command() {
  try {
    const { stdout: rawRecentSpace } = await runYabaiCommand(`-m query --spaces --space recent`);
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
      console.error("Error executing yabai commands", error.message);
      showHUD(`Error: ${error.message}`);
    } else {
      showHUD(`Error: ${error}`);
    }
  }
}
