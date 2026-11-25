import { MacOSPlatformAdapter } from "./macos";
import { IPlatformAdapter } from "./types";
import { WindowsPlatformAdapter } from "./windows";

export function getPlatformAdapter(platform = process.platform): IPlatformAdapter {
  if (platform === "win32") {
    return new WindowsPlatformAdapter();
  }
  // Default to macOS adapter for darwin and POSIX systems
  return new MacOSPlatformAdapter();
}

export const currentPlatformAdapter: IPlatformAdapter = getPlatformAdapter();
export * from "./types";
