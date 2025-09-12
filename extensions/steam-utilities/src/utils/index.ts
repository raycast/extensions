import { exec } from "child_process";
import { promisify } from "util";
import { showFailureToast } from "@raycast/utils";

// Platform utility
export const isWindows = process.platform === "win32";

const execAsync = promisify(exec);

/**
 * Execute a Windows command and return the result
 * @param command - The command to execute
 * @param options - Additional options for command execution
 * @returns Promise with command output
 */
export async function executeCommand(
  command: string,
  options?: { timeout?: number; encoding?: BufferEncoding },
): Promise<string> {
  try {
    if (!isWindows) {
      throw new Error("This command requires Windows (win32)");
    }
    const { stdout } = await execAsync(command, {
      timeout: options?.timeout || 10000,
      encoding: options?.encoding || "utf8",
    });
    return stdout.trim();
  } catch (error) {
    console.error(`Command failed: ${command}`, error);
    throw error;
  }
}

/**
 * Show a standardized failure toast
 * @param error - Unknown error to render in toast
 * @param options - Optional title override
 */
export async function showFailure(error: unknown, options?: { title?: string }): Promise<void> {
  try {
    await showFailureToast(error, options);
  } catch (e) {
    console.error("Failed to show failure toast:", e);
  }
}

/**
 * Parse CSV-like output from Windows commands
 * @param output - Raw command output
 * @param skipLines - Number of lines to skip from the beginning
 * @returns Parsed data as array of objects
 */
export function parseCommandOutput(output: string, skipLines: number = 1): Record<string, string>[] {
  const lines = output.split("\n").filter((line) => line.trim());
  if (lines.length <= skipLines) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(skipLines).map((line) => {
    const values = line.split(",");
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim() || "";
    });
    return obj;
  });
}

/**
 * Format bytes to human readable format
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.2 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Debounce function to limit the rate of function calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
