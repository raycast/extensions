import { spawn, ChildProcess } from "child_process";
import { showHUD } from "@raycast/api";

export function run(
  command: string,
  args: string[] = [],
  onError?: (error: Error) => void,
  useShell = false,
): ChildProcess {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    shell: useShell,
  });

  child.on("error", (error) => {
    if (onError) {
      onError(error);
    } else {
      console.error(`Failed to start ${command}:`, error);
    }
  });

  child.unref();
  return child;
}

/**
 * Run a command and show a success HUD, or error HUD if it fails
 */
export async function runWithFeedback(
  command: string,
  args: string[] = [],
  successMessage: string,
  errorMessage?: string,
  timeoutMs: number = 5000,
): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      const child = run(command, args, (error) => {
        reject(error);
      });

      // Set timeout in case process doesn't exit cleanly
      const timeout = setTimeout(() => {
        resolve(); // Assume success if no error after timeout
      }, timeoutMs);

      child.on("exit", (code) => {
        clearTimeout(timeout);
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });
    await showHUD(successMessage);
  } catch (error) {
    const message = errorMessage || `Failed: ${successMessage}`;
    await showHUD(message);
    console.error(error);
    throw error;
  }
}
