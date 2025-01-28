import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export default async function main() {
  const command = "defaults write com.apple.Dock contents-immutable -bool true; killall Dock"; // Replace this with your desired terminal command

  try {
    await execPromise(command);
    await showHUD("Dock layout has been locked.");
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
