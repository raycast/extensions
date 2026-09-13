export function isWindowsPlatform(): boolean {
  return process.platform === "win32";
}

export function isMacPlatform(): boolean {
  return process.platform === "darwin";
}

/** Raycast hosts we support for launch (Windows + macOS). */
export function isSupportedPlatform(): boolean {
  return isWindowsPlatform() || isMacPlatform();
}
