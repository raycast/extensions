import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { execYabaiCommand } from "./utils";

export default async function main() {
  try {
    // Create a new space
    await execYabaiCommand(`-m space --destroy`, (error, stdout, stderr) => {
      // Show HUD notification
      showHUD(`Destroyed Space`);
      execYabaiCommand(`-m space --focus recent`);
    });
  } catch (error) {
    console.error("Error executing yabai commands", error);
    await showHUD(`Error: ${error}`);
  }
}
