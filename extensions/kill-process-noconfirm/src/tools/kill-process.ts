import { exec } from "child_process";

/**
 * Input type for killing a process
 */
type Input = {
  /**
   * App name to kill
   */
  processName?: string;

  /**
   * Process ID to kill
   */
  id: number;

  /**
   * Path to the process to kill
   */
  path?: string;
};

/**
 * Kill a process.
 * Provide the process ID to kill.
 * If the process is not found, the tool will return an error.
 */
export default async function killProcess(input: Input) {
  return new Promise((resolve, reject) => {
    exec(`kill -9 ${input.id}`, (killErr) => {
      if (killErr) {
        reject(killErr);
        return;
      }
      resolve(`Killed process: ${input.processName ? input.processName + " " : ""}(PID: ${input.id})`);
    });
  });
}

// No confirmation needed for this extension
