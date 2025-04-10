import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { Alert, confirmAlert, getPreferenceValues } from "@raycast/api";

interface Preferences {
  customBattPath?: string;
}

// Check if a command exists in the system PATH
export function commandExists(command: string): boolean {
  // Sanitize command to prevent command injection
  if (!/^[a-zA-Z0-9_\-/.\s]+$/.test(command)) {
    return false;
  }
  try {
    execSync(`which ${command}`, { stdio: "ignore", shell: "/bin/bash" });
    return true;
  } catch {
    return false;
  }
}

// Get the path to the batt CLI executable
export function battPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  const customPath = preferences.customBattPath?.trim();

  const customDirectories = "/opt/homebrew/bin:/usr/local/bin";
  if (!process.env.PATH?.includes(customDirectories)) {
    process.env.PATH = `${customDirectories}:${process.env.PATH || ""}`;
  }

  // If custom path is provided and exists, use it
  if (customPath && existsSync(customPath)) {
    return customPath;
  }

  // Try to get the exact path of batt
  try {
    // Use the sanitized commandExists function instead of direct execSync
    if (commandExists("batt")) {
      const battPathFromWhich = execSync("which batt", { encoding: "utf8" }).toString().trim();
      if (battPathFromWhich && existsSync(battPathFromWhich)) {
        return battPathFromWhich;
      }
    }
  } catch {
    // If 'which' fails, continue to other methods
    console.log("Failed to find batt with 'which' command");
  }

  // Check common Homebrew paths directly
  const commonPaths = ["/opt/homebrew/bin/batt", "/usr/local/bin/batt", "/usr/bin/batt"];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // If we get here, batt wasn't found
  throw new Error("Batt CLI not found. Please install it or specify a custom path in preferences.");
}

// Display an alert to confirm batt CLI installation
export async function confirmAlertBatt(): Promise<boolean> {
  try {
    battPath(); // Will throw if batt is not found
    return true;
  } catch {
    const options: Alert.Options = {
      title: "Batt CLI Not Found",
      message: "The batt CLI tool is required but was not found on your system.",
      primaryAction: {
        title: "Learn How to Install",
        onAction: () => {
          execSync("open https://github.com/charlie0129/batt");
        },
      },
      dismissAction: {
        title: "Cancel",
      },
    };

    return await confirmAlert(options);
  }
}
