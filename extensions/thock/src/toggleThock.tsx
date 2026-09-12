import { showHUD, environment } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const THOCK_CLI_PATH = "/opt/homebrew/bin/thock-cli";
const STATE_FILE = path.join(environment.supportPath, "thock_state.txt");

async function getCurrentState(): Promise<boolean | null> {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return null;
    }
    const data = fs.readFileSync(STATE_FILE, "utf-8");
    return data.trim() === "true";
  } catch (err) {
    console.error("Error reading state:", err);
    return null;
  }
}

async function setCurrentState(enabled: boolean) {
  try {
    fs.writeFileSync(STATE_FILE, String(enabled), "utf-8");
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
