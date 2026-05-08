import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const DEFAULT_PATHS = [
  "/opt/homebrew/bin/lockdock",
  path.join(homedir(), ".local", "bin", "lockdock"),
];

export class LockdockNotInstalledError extends Error {
  constructor() {
    super(
      "LockDock is not installed or not found in PATH. Install it with: brew install mishamyrt/tap/lockdock",
    );
    this.name = "LockdockNotInstalledError";
  }
}

export function getLockDockPath(): string {
  for (const candidate of DEFAULT_PATHS) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new LockdockNotInstalledError();
}

export function getLockDockPathSafe(): string | null {
  try {
    return getLockDockPath();
  } catch {
    return null;
  }
}
