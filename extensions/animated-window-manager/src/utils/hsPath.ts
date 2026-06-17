import { existsSync } from "fs";
import { execSync } from "child_process";

export function getHsPath(): string {
  try {
    // Try finding hs globally via `which`
    const path = execSync("which hs").toString().trim();
    if (path) return path;
  } catch {
    // ignore errors if hs is not globally available
  }

  // Check hardcoded fallback paths
  if (existsSync("/opt/homebrew/bin/hs")) return "/opt/homebrew/bin/hs";
  if (existsSync("/usr/local/bin/hs")) return "/usr/local/bin/hs";

  // Throw error if not found anywhere
  throw new Error(
    "Hammerspoon CLI not found. Please install it with: brew install --cask hammerspoon and create the appropriate symlink.",
  );
}
