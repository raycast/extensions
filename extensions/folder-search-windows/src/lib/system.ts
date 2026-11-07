import { spawn, SpawnOptions } from "node:child_process";
import { Terminal } from "./prefs";

/** Spawns a detached process and resolves once it has started (rejects if the executable is missing). */
function launch(file: string, args: string[], options: SpawnOptions = {}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(file, args, { detached: true, stdio: "ignore", ...options });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

/** Opens Explorer with the folder selected in its parent. */
export function revealInExplorer(folder: string) {
  return launch("explorer.exe", [`/select,"${folder}"`], { windowsVerbatimArguments: true });
}

export function openInTerminal(folder: string, terminal: Terminal) {
  switch (terminal) {
    case "wt":
      return launch("wt.exe", ["-d", folder]);
    case "pwsh":
      return launch("cmd.exe", ["/c", "start", "", "pwsh.exe", "-NoExit"], { cwd: folder, windowsHide: true });
    case "powershell":
      return launch("cmd.exe", ["/c", "start", "", "powershell.exe", "-NoExit"], { cwd: folder, windowsHide: true });
    case "cmd":
    default:
      return launch("cmd.exe", ["/c", "start", "", "cmd.exe"], { cwd: folder, windowsHide: true });
  }
}

/** Runs an editor CLI (code, cursor, zed…) through cmd so .cmd shims on PATH work. */
export function openInEditor(folder: string, command: string) {
  return launch("cmd.exe", ["/c", command, folder], { windowsHide: true });
}
