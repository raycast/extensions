export type Platform = "macos" | "windows";

export function getPlatform(): Platform {
  if (process.platform === "darwin") {
    return "macos";
  }
  if (process.platform === "win32") {
    return "windows";
  }
  throw new Error(`Unsupported platform: ${process.platform}`);
}
