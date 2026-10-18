import { spawn } from "child_process";
import { switch_tab, new_tab } from "rust:../../rust";
import { getWindowsUserDataPath, requireBraveExecutable } from "./platform";

export function launchBrave(args: string[]): Promise<void> {
  const executable = requireBraveExecutable();
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [`--user-data-dir=${getWindowsUserDataPath()}`, ...args], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export async function switchToTabByTitle(title: string): Promise<void> {
  await switch_tab(requireBraveExecutable(), title);
}

export async function createNewTab(): Promise<void> {
  if (await new_tab(requireBraveExecutable())) return;
  await launchBrave(["brave://newtab/"]);
}
