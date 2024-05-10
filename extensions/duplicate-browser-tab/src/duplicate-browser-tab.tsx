import { closeMainWindow, showHUD, environment } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";

const execPromise = promisify(exec);

export default async function Command() {
  try {
    const applescriptPath = join(environment.assetsPath, "duplicate-tab.applescript");
    console.log("❓ Duplicating browser tab... ❓", {
      applescriptPath,
    });
    console.log(`START Executing AppleScript: osascript "${applescriptPath}"`);

    const { stdout, stderr } = await execPromise(`osascript "${applescriptPath}"`);

    console.log(`EXECUTED AppleScript: osascript "${applescriptPath}"`);

    if (stderr) {
      console.error(`AppleScript stderr: ${stderr}`);
      await showHUD(stderr);
    } else {
      const [logMessages, statusMessage] = stdout.trim().split("\n");
      console.log("AppleScript logs:");
      console.log(logMessages);

      console.log(`AppleScript result: ${statusMessage}`);
      await showHUD(statusMessage);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    await showHUD("Failed to duplicate tab. Make sure a supported browser is active.");
  }
  await closeMainWindow();
}
