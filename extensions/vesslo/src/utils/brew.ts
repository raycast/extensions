import { existsSync } from "fs";

/**
 * Detect Homebrew path based on CPU architecture
 * Apple Silicon: /opt/homebrew/bin/brew
 * Intel: /usr/local/bin/brew
 */
export function getBrewPath(): string {
  if (existsSync("/opt/homebrew/bin/brew")) {
    return "/opt/homebrew/bin/brew";
  }
  return "/usr/local/bin/brew";
}
