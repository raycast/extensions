import { exec } from "child_process";
import { promisify } from "node:util";

/**
 * Executes a shell command and returns the standard output.
 *
 * @param {string} cmd - The command to execute.
 * @returns {Promise<string>} A promise that resolves to the standard output of the executed command.
 */
export const runCmd = async (cmd: string): Promise<string> => {
  try {
    const execPromise = promisify(exec);

    // Needed for the 'pass' command to work on M1 Mac
    const shellPrefix = "export PATH=$PATH:/opt/homebrew/bin &&";

    // Execute the command and wait for the result
    const { stdout } = await execPromise(`${shellPrefix} ${cmd}`, { shell: "/bin/zsh" });

    // Return the standard output
    return stdout;
  } catch (error) {
    // Log the error and rethrow it
    console.error("Error executing command:", error);
    throw error;
  }
};
