import { homedir } from "node:os";
import { join } from "node:path";

const FORK_BUNDLE_ID_MACOS = "com.DanPristupov.Fork";

// On macOS, use bundle ID; on Windows, use application name
export const FORK_APP_IDENTIFIER = process.platform === "win32" ? "Fork" : FORK_BUNDLE_ID_MACOS;

const getRepoFilePaths = (): string[] => {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    const forkDataDir = join(localAppData, "ForkData");
    return [join(forkDataDir, "repositories.toml"), join(forkDataDir, "repositories.json")];
  }
  // macOS
  const forkDataDir = join(homedir(), "Library", "Application Support", FORK_BUNDLE_ID_MACOS);
  return [join(forkDataDir, "repositories.toml"), join(forkDataDir, "repositories.json")];
};

export const REPO_FILE_PATHS = getRepoFilePaths();
