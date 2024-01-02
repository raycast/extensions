import { showHUD } from "@raycast/api";
import { execYabaiCommand } from "./utils";

export default async function main() {
  try {
    // Create a new space
    await execYabaiCommand(`-m space --create`);

    // Get the last space index that is not native fullscreen
    const { stdout: spacesOutput } = await execYabaiCommand(`-m query --spaces`);
    const spaces = JSON.parse(spacesOutput);
    const lastSpaceIndex = spaces.filter((space: { [x: string]: any; }) => !space["is-native-fullscreen"]).pop().index;

    // Focus the last space
    await execYabaiCommand(`-m space --focus ${lastSpaceIndex}`);

    // Show HUD notification
    await showHUD(`Created space: ${lastSpaceIndex}`);
  } catch (error) {
    console.error("Error executing yabai commands", error);
    if (error instanceof Error) {
      await showHUD(`Error: ${error.message}`);
    } else {
      await showHUD(`Error: ${error}`);
    }
  }
}