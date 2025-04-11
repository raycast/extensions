import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);
const THOCK_CLI_PATH = "/opt/homebrew/bin/thock-cli";
const STATE_FILE = `${process.env.HOME}/Library/Application Support/thock/thock_state.txt`;

async function getCurrentState(): Promise<boolean | null> {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return null;
    }
    const { stdout } = await execAsync(`cat "${STATE_FILE}"`);
    return stdout.trim() === "true";
  } catch (err) {
    console.error("Error reading state:", err);
    return null;
  }
}

async function setCurrentState(enabled: boolean) {
  try {
    await execAsync(`echo "${enabled}" > "${STATE_FILE}"`);
  } catch (err) {
    console.error("Failed to write state:", err);
  }
}

export default async function Command() {
  const currentState = await getCurrentState();
  const newState = currentState === null ? true : !currentState;

  try {
    await execAsync(`${THOCK_CLI_PATH} set-enabled "${newState}"`);
    await setCurrentState(newState);
    await showHUD(`Thock is now ${newState ? "Enabled ✅" : "Disabled ❌"}`);
  } catch (err) {
    await showHUD("❌ Failed to toggle Thock");
    console.error("Toggle error:", err);
  }
}
