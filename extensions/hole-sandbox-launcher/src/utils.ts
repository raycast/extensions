import { homedir } from "os";

export function expandTilde(path: string): string {
  if (path === "~" || path.startsWith("~/")) {
    return homedir() + path.slice(1);
  }
  return path;
}

export function escapeForShell(s: string): string {
  return "'" + expandTilde(s).replace(/'/g, "'\\''") + "'";
}

export function escapeForAppleScript(s: string): string {
  return expandTilde(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
