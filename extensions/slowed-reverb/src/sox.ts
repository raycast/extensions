import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const isWindows = process.platform === "win32";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

export async function findSox(): Promise<string> {
  const customPath = getPreferenceValues<Preferences>().customSoxPath?.trim();
  const executable = isWindows ? "sox.exe" : "sox";
  const pathDirectories = (process.env.PATH ?? "")
    .split(path.delimiter)
    .map((directory) => directory.replace(/^"|"$/g, ""));
  const installDirectories = isWindows
    ? [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]]
        .filter((directory): directory is string => Boolean(directory))
        .flatMap((directory) => ["SoX", "sox-14-4-2"].map((folder) => path.join(directory, folder)))
    : [
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/opt/local/bin",
        "/usr/bin",
        "/bin",
        "/usr/sbin",
        "/sbin",
        "/opt/X11/bin",
      ];

  if (isWindows && process.env.LOCALAPPDATA) {
    installDirectories.unshift(path.join(process.env.LOCALAPPDATA, "Microsoft", "WinGet", "Links"));
  }

  const candidates = [
    customPath,
    ...[...pathDirectories, ...installDirectories]
      .filter((directory) => path.isAbsolute(directory))
      .map((directory) => path.join(directory, executable)),
  ];
  for (const candidate of new Set(candidates)) {
    if (!candidate || !path.isAbsolute(candidate)) continue;
    try {
      if (!(await stat(candidate)).isFile()) continue;
      await access(candidate, isWindows ? constants.F_OK : constants.X_OK);
      return candidate;
    } catch {
      // Check the next installation location.
    }
  }

  const install = isWindows ? "winget install --id ChrisBagwell.SoX -e" : "brew install sox";
  throw new Error(`SoX could not be found. Run ${install}, or set the SoX Executable Path in Raycast preferences.`);
}

export async function runSox(executable: string, args: string[], cwd?: string): Promise<string> {
  try {
    const env = { ...process.env };
    delete env.SOX_OPTS;
    const { stdout } = await exec(executable, args, { cwd, env, windowsHide: true });
    return stdout.trim();
  } catch (error) {
    const stderr =
      error instanceof Error && "stderr" in error && typeof error.stderr === "string" ? error.stderr.trim() : "";
    throw new Error(stderr || `Could not run SoX. Check the SoX Executable Path. ${errorMessage(error)}`);
  }
}
