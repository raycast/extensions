/**
 * What this machine looks like to Homebrew.
 *
 * Kept out of `installability.ts` so that module stays free of imports and can
 * be unit tested.
 */

import { execSync } from "child_process";
import type { BrewHost } from "./installability";

export const brewHost: BrewHost = (() => {
  let macos: string | undefined;
  try {
    macos = execSync("/usr/bin/sw_vers -productVersion", { encoding: "utf8" }).trim() || undefined;
  } catch {
    // sw_vers unavailable; the macOS gate simply does not apply.
  }
  // Homebrew reads its own architecture from MACHTYPE in the shell running
  // `brew` (`utils/os.sh:10-20`); the prefix never enters into it. That shell is
  // a child of this process, so brew's arch is ours — an arm64 Raycast running
  // /usr/local/bin/brew is an arm64 brew, which is exactly why Homebrew refuses
  // that combination ("Cannot install in Homebrew on ARM processor in Intel
  // default prefix", `extend/os/mac/install.rb:28`) instead of falling back to
  // Rosetta. Under a Rosetta-translated Raycast, process.arch reports x64 and
  // the child is x86_64 too, so this holds there as well.
  const arch: BrewHost["arch"] = process.arch === "arm64" ? "arm64" : "x86_64";
  return { macos, arch };
})();
