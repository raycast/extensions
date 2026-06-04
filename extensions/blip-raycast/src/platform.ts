export const isMac = process.platform === "darwin";
export const isWindows = process.platform === "win32";
export const fileManagerName = isMac ? "Finder" : "File Explorer";
