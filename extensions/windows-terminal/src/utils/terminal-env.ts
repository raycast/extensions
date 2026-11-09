import fs from "node:fs";

// Raycast's extension worker only exposes a handful of variables (PATH, HOME, TEMP...). Windows
// Terminal inherits whatever we hand wt.exe, and its PowerShell detector looks in
// %ProgramFiles%\PowerShell. Without ProgramFiles, a Terminal cold-started from here marks the
// PowerShell 7 profile "no longer detected". That orphaned profile also loses its default
// %USERPROFILE% starting directory, so later launches open it in the launcher's folder (System32).
// See https://github.com/raycast/extensions/issues/32798
export function getWindowsTerminalEnv(baseEnv: NodeJS.ProcessEnv = process.env) {
  const env = { ...baseEnv };
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "Path";
  const systemRoot = env.SystemRoot ?? env.SYSTEMROOT ?? "C:\\Windows";
  const systemDrive = systemRoot.slice(0, 2);
  const pathParts = (env[pathKey] ?? "").split(";").filter(Boolean);
  const requiredPathParts = [`${systemRoot}\\System32\\OpenSSH`, `${systemRoot}\\System32`, systemRoot];
  const normalizePathPart = (pathPart: string) => pathPart.toLowerCase().replace(/\\+$/, "");

  // Keep Windows OpenSSH and System32 on PATH
  env[pathKey] = [
    ...pathParts,
    ...requiredPathParts.filter(
      (requiredPathPart) =>
        !pathParts.some((pathPart) => normalizePathPart(pathPart) === normalizePathPart(requiredPathPart)),
    ),
  ].join(";");

  // Restore Program Files Variables
  // ponytail: assumes the standard folder names on the system drive; read
  // HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion if relocated installs ever matter.
  const programFiles: Record<string, string> = {
    ProgramFiles: `${systemDrive}\\Program Files`,
    "ProgramFiles(x86)": `${systemDrive}\\Program Files (x86)`,
    "ProgramFiles(Arm)": `${systemDrive}\\Program Files (Arm)`,
  };
  for (const [key, value] of Object.entries(programFiles)) {
    const hasKey = Object.keys(env).some((envKey) => envKey.toLowerCase() === key.toLowerCase());
    if (!hasKey && fs.existsSync(value)) {
      env[key] = value;
    }
  }

  return env;
}
