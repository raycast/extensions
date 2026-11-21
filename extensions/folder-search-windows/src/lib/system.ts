import { execFile, spawn, SpawnOptions } from "node:child_process";
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

/** Resolves a command name on PATH to its full path (e.g. "code" -> "...\bin\code.cmd"). */
async function resolveOnPath(command: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFile("where.exe", [command], { windowsHide: true, encoding: "utf8" }, (error, stdout) => {
      if (error) return resolve(undefined);
      const lines = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      // Prefer a real executable over a batch shim when both exist.
      resolve(lines.find((l) => /\.exe$/i.test(l)) ?? lines[0]);
    });
  });
}

/**
 * Runs an editor CLI (code, cursor, zed…) on a folder.
 * The folder path is never placed in a shell command line: folder names such as `a&calc&` are valid on Windows
 * and would otherwise be executed by cmd.exe. Executables get the path as a plain argument; .cmd/.bat shims
 * (which need cmd.exe) receive it through an environment variable, inside quotes.
 */
export async function openInEditor(folder: string, command: string) {
  const resolved = (await resolveOnPath(command)) ?? (command.includes("\\") ? command : undefined);
  if (!resolved) throw new Error(`Editor command “${command}” was not found on your PATH`);

  if (/\.(cmd|bat)$/i.test(resolved)) {
    // A path cannot contain a double quote on Windows, so "%FSW_FOLDER%" is always one safe quoted token.
    return launch("cmd.exe", ["/d", "/s", "/c", `""${resolved}" "%FSW_FOLDER%""`], {
      windowsHide: true,
      windowsVerbatimArguments: true,
      env: { ...process.env, FSW_FOLDER: folder },
    });
  }
  return launch(resolved, [folder], { windowsHide: true });
}
