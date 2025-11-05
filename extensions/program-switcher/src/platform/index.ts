// Platform detection and adapter factory

import { PlatformAdapter } from "./types";
import { WindowsPlatformAdapter } from "./windows";
import { MacOSPlatformAdapter } from "./macos";

/**
 * Get the appropriate platform adapter based on the current OS
 */
export function getPlatformAdapter(): PlatformAdapter {
  const isWindows = process.platform === "win32";
  const isMacOS = process.platform === "darwin";

  if (isWindows) {
    return new WindowsPlatformAdapter();
  } else if (isMacOS) {
    return new MacOSPlatformAdapter();
  } else {
    throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

export * from "./types";
