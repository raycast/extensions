import { homedir, platform } from "os";
import { join, normalize } from "path";

/** Expand ~ and %ENV% in user-provided paths (cross-platform). */
export function expandUserPath(input: string): string {
  let expanded = input.trim();
  if (!expanded) {
    return expanded;
  }

  expanded = expanded.replace(/%([^%]+)%/g, (_, varName: string) => process.env[varName] ?? `%${varName}%`);

  if (expanded === "~") {
    return normalize(homedir());
  }

  if (expanded.startsWith("~/") || expanded.startsWith("~\\")) {
    return normalize(join(homedir(), expanded.slice(2)));
  }

  return normalize(expanded);
}

export function isWindows(): boolean {
  return platform() === "win32";
}
