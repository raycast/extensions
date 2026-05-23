export type SupportedPlatform = "darwin" | "win32" | "linux";

export const runtimePlatform = process.platform as SupportedPlatform | string;

export const isMac = runtimePlatform === "darwin";
export const isWindows = runtimePlatform === "win32";
export const isLinux = runtimePlatform === "linux";

export function getPlatformLabel(): string {
  if (isMac) {
    return "macOS";
  }
  if (isWindows) {
    return "Windows";
  }
  if (isLinux) {
    return "Linux";
  }
  return "this system";
}

export function getKillMethodDescription(): string {
  if (isWindows) {
    return "Sends a graceful stop first, then force-kills the process if it is still running.";
  }
  return "Sends SIGTERM first, then SIGKILL if the process is still alive.";
}
