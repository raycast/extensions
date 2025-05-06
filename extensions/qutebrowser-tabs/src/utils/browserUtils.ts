/**
 * Utilities for browser process management and command execution
 */
import { exec } from "child_process";
import util from "util";
import { formatError } from "./common/errorUtils";
import { sanitizeCommandString } from "./common/stringUtils";
import { validateExecutablePath } from "./common/pathUtils";

const execPromise = util.promisify(exec);

export const QUTEBROWSER_PROCESS_CHECK = "ps aux | grep -v grep | grep qutebrowser";

/**
 * Check if qutebrowser is currently running
 * @returns Promise that resolves to true if running, false otherwise
 */
export async function isRunning(): Promise<boolean> {
  try {
    const psResult = await execPromise(QUTEBROWSER_PROCESS_CHECK);
    return psResult.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Execute a command in qutebrowser
 * @param qutebrowserPath Path to qutebrowser executable
 * @param command Command to execute
 * @returns Promise that resolves when command completes
 */
export async function executeCommand(qutebrowserPath: string, command: string): Promise<void> {
  try {
    // Check if the qutebrowser executable exists
    validateExecutablePath(qutebrowserPath);

    // Sanitize the paths and command to prevent command injection
    const safePath = sanitizeCommandString(qutebrowserPath);
    const safeCommand = sanitizeCommandString(command);
    await execPromise(`"${safePath}" "${safeCommand}"`);
  } catch (error) {
    console.error("Error executing qutebrowser command:", error);
    throw new Error(formatError(error, "Failed to execute qutebrowser command"));
  }
}
