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
  // Homebrew's arch is the brew process's own MACHTYPE (`utils/os.sh`), and the
  // prefix is the only cheap tell we have: /usr/local is the Intel install (it
  // runs under Rosetta on Apple Silicon), /opt/homebrew the Apple Silicon one.
  // `customBrewPath` can point at a brew under ANY prefix, and an Intel one
  // there would read as arm64 — so leave it unknown rather than guess, per this
  // module's never-mark-on-a-guess bias. Unknown arch skips the arch gate.
  const arch: BrewHost["arch"] =
    brewPrefix === "/opt/homebrew" ? "arm64" : brewPrefix === "/usr/local" ? "x86_64" : undefined;
  return { macos, arch };
})();
