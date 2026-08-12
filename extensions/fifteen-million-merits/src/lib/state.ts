import { environment, LocalStorage } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";

export interface StateFile {
  agentsCounter: number;
}

const STATE_FILE = path.join(environment.supportPath, "state.json");
const PREVIOUS_COUNTER_KEY = "previousAgentsCounter";

export const DEFAULT_STATE: StateFile = {
  agentsCounter: 0,
};

/**
 * Gets the previous agents counter value from LocalStorage.
 */
export async function getPreviousAgentsCounter(): Promise<number | null> {
  const value = await LocalStorage.getItem<string>(PREVIOUS_COUNTER_KEY);
  return value !== undefined && value !== null ? parseInt(value, 10) : null;
}

/**
 * Sets the previous agents counter value in LocalStorage.
 */
export async function setPreviousAgentsCounter(value: number): Promise<void> {
  await LocalStorage.setItem(PREVIOUS_COUNTER_KEY, String(value));
}

/**
 * Gets the state file path.
 * Useful for external tools that need to access the state file directly.
 */
export function getStateFilePath(): string {
  return STATE_FILE;
}

/**
 * Reads the current state from the state file.
 * Returns default state if file doesn't exist or is corrupted.
 */
export function readState(): StateFile {
  if (!fs.existsSync(STATE_FILE)) {
    return { ...DEFAULT_STATE };
  }

  try {
    const content = fs.readFileSync(STATE_FILE, "utf-8");
    const parsed = JSON.parse(content) as Partial<StateFile>;

    return {
      agentsCounter:
        typeof parsed.agentsCounter === "number" ? Math.max(0, parsed.agentsCounter) : DEFAULT_STATE.agentsCounter,
    };
  } catch (error) {
    console.error("Failed to read state file, returning default state:", error);
    return { ...DEFAULT_STATE };
  }
}

/**
 * Writes state to the state file atomically using a temp file and rename.
 */
export function writeState(state: StateFile): void {
  const tempFile = `${STATE_FILE}.tmp`;

  try {
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2));
    fs.renameSync(tempFile, STATE_FILE);
  } catch (error) {
    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Initializes the agents counter with default value if it doesn't exist.
 */
export function initializeAgentsCounter(): void {
  if (!fs.existsSync(STATE_FILE)) {
    setAgentsCounter(DEFAULT_STATE.agentsCounter);
  }
}

/**
 * Gets the current agents counter value from the state file.
 */
export function getAgentsCounter(): number {
  const state = readState();
  const agentsCounter = state.agentsCounter;
  return agentsCounter;
}

/**
 * Sets the agents counter to a specific value.
 */
export function setAgentsCounter(value: number): void {
  writeState({ ...readState(), agentsCounter: Math.max(0, value) });
}

/**
 * Increments the agents counter by 1.
 */
export function incrementAgentsCounter(): void {
  setAgentsCounter(getAgentsCounter() + 1);
}

/**
 * Decrements the agents counter by 1.
 */
export function decrementAgentsCounter(): void {
  setAgentsCounter(getAgentsCounter() - 1);
}

/**
 * Resets the state to default values.
 */
export function resetAgentsCounter(): void {
  setAgentsCounter(DEFAULT_STATE.agentsCounter);
}
