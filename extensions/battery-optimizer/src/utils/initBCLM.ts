import { execSync } from "node:child_process";
import { confirmAlert, environment, open, openExtensionPreferences } from "@raycast/api";
import { join } from "path";
import { use_built_in_BCLM } from "./getPreference";

const commandExists = (command: string) => {
  try {
    return !execSync(`zsh -l -c 'which ${command}'`).toString().trim().includes("not found");
  } catch (e) {
    return false;
  }
};

// Remind users to install bclm
export async function confirmAlertBrew() {
  if (!use_built_in_BCLM() && !commandExists("bclm")) {
    return await confirmAlert({
      title: "Whether to install bclm?",
      message:
        "The extension depends on BCLM installed via brew. For more details, visit the GitHub page. \nAlternatively,you can use the built-in BCLM for convenience, but you will need to update the extension manually.",
      primaryAction: {
        title: "Open GitHub",
        onAction: async () => {
          await open("https://github.com/zackelia/bclm");
        },
      },
      dismissAction: {
        title: "Built-in BCLM",
        onAction: async () => {
          await openExtensionPreferences();
        },
      },
    });
  }
}

export const bclmPath = () => {
  try {
    return !use_built_in_BCLM() && commandExists("bclm")
      ? execSync(`zsh -l -c 'which bclm'`).toString().trim()
      : join(environment.assetsPath, "binary/bclm");
  } catch (e) {
    return join(environment.assetsPath, "binary/bclm");
  }
};
console.log("bclm_path:" + bclmPath());
export const setPermissions = async () => {
  return execSync(`/bin/chmod u+x ${bclmPath()}`);
};
