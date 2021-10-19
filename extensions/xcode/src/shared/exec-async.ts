import { exec } from "child_process";

/**
 * The ExecAsync Output
 */
export interface ExecAsyncOutput {
  /**
   * The standard output
   */
  stdout: string;
  /**
   * The standard error output
   */
  stderr: string;
}

/**
 * Spawns a shell then executes the command within that shell, buffering any generated output.
 * @param command The shell command that should be executed
 */
export function execAsync(
  command: string
): Promise<ExecAsyncOutput> {
  return new Promise((resolve, reject) => {
    // Execute command
    exec(
      command,
      (error, stdout, stderr) => {
        // Check if an error is available
        if (error) {
          // Reject with error
          reject(error);
        } else {
          // Otherwise resolve with output
          resolve({
            stdout: stdout,
            stderr: stderr
          });
        }
      }
    );
  });
}
