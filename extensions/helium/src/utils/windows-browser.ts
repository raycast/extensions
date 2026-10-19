import { spawn } from "child_process";
import { existsSync } from "fs";
import { new_tab, switch_tab } from "rust:../../rust";
import { getUserDataPathPreference, getWindowsUserDataPath, requireHeliumExecutable } from "./platform";
import { canRevealVerticalTabs } from "./helium-profile";

const NEW_TAB_PAGE = "chrome://new-tab-page/";

function launchHelium(args: string[]): Promise<void> {
  const executable = requireHeliumExecutable();
  const userDataDir = getWindowsUserDataPath();
  const profileArgs = userDataDir && existsSync(userDataDir) ? [`--user-data-dir=${userDataDir}`] : [];
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [...profileArgs, ...args], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });
    child.once("error", (error) => reject(new Error(`Could not start Helium at ${executable}: ${error.message}`)));
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export async function openUrlInHelium(url: string): Promise<void> {
  await launchHelium([url]);
}

export async function switchToTabByTitle(title: string): Promise<boolean> {
  await switch_tab(requireHeliumExecutable(), title, canRevealVerticalTabs());
  return true;
}

export async function createNewTab(): Promise<void> {
  if (!getUserDataPathPreference() && (await new_tab(requireHeliumExecutable()))) return;
  await launchHelium([NEW_TAB_PAGE]);
}

export async function createNewWindow(): Promise<void> {
  await launchHelium(["--new-window", NEW_TAB_PAGE]);
}

export async function createNewIncognitoWindow(): Promise<void> {
  await launchHelium(["--incognito"]);
}
