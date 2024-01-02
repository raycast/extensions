import { showHUD } from "@raycast/api";
import { execYabaiCommand } from "./utils";

export default async function main() {
  try {
    // Get the index of the recent space
    const { stdout: rawRecentSpace } = await execYabaiCommand(`-m query --spaces --space recent`);
    const recentSpace = JSON.parse(rawRecentSpace);
    const lastSpaceIndex = recentSpace.index;

    // Destroy the current space
    await execYabaiCommand(`-m space --destroy`);

    try {
      // Focus the last space used before destroying the current space
      await execYabaiCommand(`-m space --focus ${lastSpaceIndex}`);
    } catch (error) {
      // ignored
    }

    await showHUD(`Destroyed Space`);
  } catch (error) {
    console.error("Error executing yabai commands", error);
    showHUD(`Error: ${error}`);
  }
}
