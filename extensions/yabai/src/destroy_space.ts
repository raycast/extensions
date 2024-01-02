import { showHUD } from "@raycast/api";
import { execYabaiCommand } from "./utils";

export default async function main() {
  try {
    // Create a new space
    await execYabaiCommand(`-m space --destroy`);
    showHUD(`Destroyed Space`);
    execYabaiCommand(`-m space --focus recent`);
  } catch (error) {
    console.error("Error executing yabai commands", error);
    showHUD(`Error: ${error}`);
  }
}
