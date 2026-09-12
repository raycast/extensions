import { execSync } from "node:child_process";
import { confirmAlert, open } from "@raycast/api";
import { preferences } from "./getPreference";

interface ExecSyncError extends Error {
  stdout: Buffer;
  stderr: Buffer;
}

// Function to check if a command exists
const commandExists = (command: string): boolean => {
  try {
    const PATH = "/usr/gnu/bin:/usr/local/bin:/bin:/usr/bin:.:/opt/homebrew/bin";
    const shellResult = execSync(`zsh -l -c 'export PATH="$PATH:${PATH}" && which ${command}'`).toString().trim();
    return !shellResult.includes("not found");
  } catch (e: unknown) {
    if (e instanceof Error && "stdout" in e) {
      const execError = e as ExecSyncError;
      console.error("commandExists stdout:", execError.stdout.toString());
      console.error("commandExists stderr:", execError.stderr.toString());
    }
    return false;
  }
};

// Function to check if a custom path is valid
const pathExists = (path: string): boolean => {
  try {
    return execSync(`[ -x "${path}" ] && echo exists || echo not_found`).toString().trim() === "exists";
  } catch (e) {
    return false;
  }
};

// Remind users to install batt
export async function confirmAlertBatt(): Promise<boolean> {
  const customPath = preferences.customBattPath;

  const battExists = commandExists("batt");
  const customPathValid = customPath && pathExists(customPath);

  if (!battExists && !customPathValid) {
    const userConfirmed = await confirmAlert({
      title: "Install batt?",
      message: "The batt executable was not found. Would you like to show it on GitHub?",
      primaryAction: {
        title: "Open GitHub",
        onAction: async () => {
          await open("https://github.com/charlie0129/batt");
        },
      },
    });

    return userConfirmed;
  }

  return true; // Indicate that batt exists either via command or custom path
}

// Function to get the batt path
export const battPath = () => {
  try {
    if (commandExists("batt")) {
      const PATH = "/usr/gnu/bin:/usr/local/bin:/bin:/usr/bin:.:/opt/homebrew/bin";
      return execSync(`zsh -l -c 'export PATH="$PATH:${PATH}" && which batt'`).toString().trim();
    } else if (preferences.customBattPath) {
      return preferences.customBattPath;
    } else {
      throw new Error("The batt executable was not found, and no custom path is set.");
    }
  } catch (e) {
    if (e instanceof Error && "stdout" in e) {
      const execError = e as ExecSyncError;
      throw new Error(
        "commandExists stdout:" + execError.stdout.toString() + "\ncommandExists stderr:" + execError.stderr.toString(),
      );
    }
    throw new Error("The batt executable was not found, and no custom path is set.");
  }
};
