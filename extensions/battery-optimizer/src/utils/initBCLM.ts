import { execSync } from "node:child_process";
import { confirmAlert, open } from "@raycast/api";
import { preferences } from "./getPreference";

// Function to check if a command exists
const commandExists = (command: string): boolean => {
  try {
    return execSync(`which ${command}`).toString().trim().length > 0;
  } catch (e) {
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

// Remind users to install bclm
export async function confirmAlertBrew(): Promise<boolean> {
  const customPath = preferences.customBCLMPath;

  const bclmExists = commandExists("bclm");
  const customPathValid = customPath && pathExists(customPath);

  if (!bclmExists && !customPathValid) {
    const userConfirmed = await confirmAlert({
      title: "Whether to install bclm?",
      message: "The bclm executable was not found. Would you like to install it from GitHub?",
      primaryAction: {
        title: "Open GitHub",
        onAction: async () => {
          await open("https://github.com/zackelia/bclm");
        },
      },
    });

    return userConfirmed;
  }

  return true; // Indicate that bclm exists either via command or custom path
}

// Function to get the bclm path
export const bclmPath = () => {
  try {
    if (commandExists("bclm")) {
      return execSync(`zsh -l -c 'which bclm'`).toString().trim();
    } else if (preferences.customBCLMPath) {
      return preferences.customBCLMPath;
    } else {
      throw new Error("The bclm executable was not found, and no custom path is set.");
    }
  } catch (e) {
    throw new Error("The bclm executable was not found, and no custom path is set.");
  }
};
