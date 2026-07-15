export type Platform = "macos" | "windows";

export function getPlatform(): Platform {
  return process.platform === "darwin" ? "macos" : "windows";
}
