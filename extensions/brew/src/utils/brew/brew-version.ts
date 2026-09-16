/**
 * Homebrew major-version gate. `brew --version` exists on every Homebrew, so
 * this runs regardless of what's installed — it's how commits that require a
 * newer major decide whether to render or fall back to {@link RequiresHomebrew}.
 */

import { execBrew } from "./commands";
import { brewLogger } from "../logger";
import { parseBrewMajor } from "./version";

let cached: Promise<number | undefined> | undefined;

/**
 * `brew --version` once per command process. undefined = brew missing,
 * unparseable, or the shallow-clone fallback string. Never throws.
 *
 * Concurrent callers share one exec. `CaskActionPanel` calls this from every
 * row of the installed list, so the first paint of a 146-cask list would
 * otherwise spawn 146 `brew --version` processes before the first answer
 * lands and populates the cache. No caller signal is bound to the shared
 * promise: one row unmounting must not cancel the answer for the rest.
 */
export function getBrewMajorVersion(): Promise<number | undefined> {
  return (cached ??= readMajorVersion());
}

async function readMajorVersion(): Promise<number | undefined> {
  try {
    const { stdout } = await execBrew("--version");
    const major = parseBrewMajor(stdout);
    if (major === undefined) {
      brewLogger.warn("Could not parse brew --version", { stdout });
    }
    return major;
  } catch (err) {
    brewLogger.warn("brew --version failed", { error: err });
    return undefined;
  }
}

/** After `brew update` (which can bump Homebrew itself) the cached answer is stale. */
export function invalidateBrewMajorVersion(): void {
  cached = undefined;
}
