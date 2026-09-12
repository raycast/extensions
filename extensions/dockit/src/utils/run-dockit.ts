import { execFile, execSync } from "child_process";
import { getPreferenceValues } from "@raycast/api";

export interface DockitResult {
  success: boolean;
  output: Record<string, unknown>;
  outputFile: string;
  error?: string;
}

/**
 * Run a dockit CLI command via subprocess.
 * Resolves (never rejects) with a DockitResult indicating success/failure.
 */
export async function runDockit(args: string[]): Promise<DockitResult> {
  const { pythonPath } = getPreferenceValues<ExtensionPreferences>();
  const python = pythonPath || "/usr/local/bin/python3";

  return new Promise((resolve) => {
    execFile(
      python,
      ["-m", "dockit", ...args],
      { timeout: 30000 },
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            success: false,
            output: {},
            outputFile: "",
            error: stderr || error.message,
          });
          return;
        }

        let output: Record<string, unknown> = {};
        try {
          output = JSON.parse(stdout.trim());
        } catch {
          // stdout might not be valid JSON
        }

        // Extract explicit output path from -o flag, or empty string
        const outputFile = args.find((_, i) => args[i - 1] === "-o") || "";

        resolve({
          success: true,
          output,
          outputFile,
        });
      },
    );
  });
}

/**
 * Get the currently selected file in Finder via AppleScript.
 * Throws if nothing is selected or Finder is not frontmost.
 */
export function getFinderSelection(): string {
  return execSync(
    `osascript -e 'tell application "Finder" to get POSIX path of (selection as alias)'`,
  )
    .toString()
    .trim();
}
