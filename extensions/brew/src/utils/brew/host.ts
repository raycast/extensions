/**
 * What this machine looks like to Homebrew.
 *
 * Kept out of `installability.ts` so that module stays free of `@raycast/api`
 * (this one reaches it through `paths.ts` → preferences) and can be unit tested.
 */

import { execSync } from "child_process";
import { brewPrefix } from "./paths";
import type { BrewHost } from "./installability";

export const brewHost: BrewHost = (() => {
  let macos: string | undefined;
  try {
    macos = execSync("/usr/bin/sw_vers -productVersion", { encoding: "utf8" }).trim() || undefined;
  } catch {
    // sw_vers unavailable; the macOS gate simply does not apply.
  }
  // Homebrew's arch is the brew process's own MACHTYPE (`utils/os.sh`): a
  // /usr/local brew on Apple Silicon runs under Rosetta and is x86_64.
  const arch: BrewHost["arch"] = process.arch === "arm64" && brewPrefix !== "/usr/local" ? "arm64" : "x86_64";
  return { macos, arch };
})();
