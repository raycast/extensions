import { homedir } from "node:os";
import { win32 } from "node:path";

// WinSCP is Windows-only, so these paths are always Windows paths, even when the tests run on a
// POSIX host. The platform-dependent helpers would join with `/` and split the PATH on `:` there.
const { dirname, join } = win32;
const PATH_SEPARATOR = ";";

const EXE = "WinSCP.exe";
const INI = "WinSCP.ini";

/**
 * Where `WinSCP.exe` may live, most specific first. When the user set the installation folder
 * preference we trust it and look nowhere else.
 */
export function winSCPExeCandidates(programPath?: string, env: NodeJS.ProcessEnv = process.env): string[] {
  if (programPath) {
    return [join(programPath, EXE)];
  }

  const folders = [
    join(homedir(), "AppData", "Local", "Programs", "WinSCP"),
    join(env.PROGRAMFILES ?? "C:\\Program Files", "WinSCP"),
    join(env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "WinSCP"),
    // Package managers such as Scoop and Chocolatey only put WinSCP on the PATH.
    ...(env.PATH ?? "").split(PATH_SEPARATOR).filter((folder) => folder.length > 0),
  ];

  return folders.map((folder) => join(folder, EXE));
}

/**
 * Where the INI may live, in the order WinSCP itself prefers: next to the executable for portable
 * installs, otherwise in `%APPDATA%`. If neither exists, sessions are stored in the registry.
 */
export function winSCPIniCandidates(exe: string, env: NodeJS.ProcessEnv = process.env): string[] {
  const appData = env.APPDATA ?? join(homedir(), "AppData", "Roaming");
  return [join(dirname(exe), INI), join(appData, INI)];
}
