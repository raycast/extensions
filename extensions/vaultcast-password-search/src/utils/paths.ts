import { homedir, platform } from "os";
import { resolve } from "path";

function expandWindowsEnvVars(input: string): string {
  if (platform() !== "win32") {
    return input;
  }

  return input
    .replace(/%USERPROFILE%/gi, homedir())
    .replace(/%LOCALAPPDATA%/gi, process.env.LOCALAPPDATA ?? homedir())
    .replace(/%APPDATA%/gi, process.env.APPDATA ?? homedir());
}

export function expandHomePath(input: string): string {
  const trimmed = expandWindowsEnvVars(input.trim());
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed === "~") {
    return homedir();
  }

  if (trimmed.startsWith("~/")) {
    return resolve(homedir(), trimmed.slice(2));
  }

  return resolve(trimmed);
}
