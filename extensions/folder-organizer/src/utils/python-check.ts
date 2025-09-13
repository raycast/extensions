import { exec } from "child_process";

/**
 * Check if Python 3 is available on the system
 * @returns Promise<boolean> - true if Python 3 is available, false otherwise
 */
export function checkPython3Available(): Promise<boolean> {
  return new Promise((resolve) => {
    exec("python3 --version", (error, stdout) => {
      if (error) {
        resolve(false);
      } else {
        // Check if the output contains "Python 3"
        const version = stdout.trim();
        resolve(version.startsWith("Python 3"));
      }
    });
  });
}
