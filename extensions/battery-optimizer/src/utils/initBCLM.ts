import { execSync } from "node:child_process";
import { confirmAlert, environment, open } from "@raycast/api";
import { join } from "path";

const commandExists = (command: string) => {
  try {
    return !execSync(`zsh -l -c 'which ${command}'`).toString().trim().includes("not found");
  } catch (e) {
    return false;
  }
};

// Remind users to install bclm
export async function confirmAlertBrew() {
  if (!commandExists("bclm")) {
    return await confirmAlert({
      title: "Whether to install bclm?",
      message: "The extension depends on BCLM installed via brew. For more details, visit the GitHub page.",
      primaryAction: {
        title: "Open GitHub",
        onAction: async () => {
          await open("https://github.com/zackelia/bclm");
        },
      },
    });
  }
}

export const bclmPath = () => {
  try {
    return commandExists("bclm")
      ? execSync(`zsh -l -c 'which bclm'`).toString().trim()
      : join(environment.assetsPath, "binary/bclm");
  } catch (e) {
    return false;
  }
};
