// =============================================================================
// BETTERDISPLAY AVAILABILITY
// Whether BetterDisplay can actually answer right now, not just whether it exists.
// -----------------------------------------------------------------------------
// Context: `betterdisplaycli` is a one-line shell wrapper that execs the whole
//   BetterDisplay app binary. There is no lightweight CLI, and no daemon: with
//   the app not running, every invocation cold-loads it and then blocks until it
//   gives up — measured at 16s. Checking `existsSync` on the wrapper only proves
//   BetterDisplay is INSTALLED, which is why the extension used to poll a binary
//   that could never answer.
// WARN: Anything that shells out to BetterDisplay must go through `usablePath()`,
//   which yields "" unless the app is both installed and running. There is no
//   configured path any more: NSWorkspace locates the app by bundle identifier,
//   which also covers installs outside /Applications that a hardcoded Homebrew
//   default missed.
// =============================================================================

import { betterDisplayPath, betterDisplayRunning } from "swift:../../swift";

/**
 * Where BetterDisplay's executable lives, or "" when it is not installed.
 *
 * @returns The absolute path, or "" when absent or unreadable.
 */
async function locate(): Promise<string> {
  try {
    return await betterDisplayPath();
  } catch {
    return "";
  }
}

/**
 * Whether BetterDisplay is installed AND running, and where its binary is.
 *
 * @returns The executable path when shelling out is worth doing, otherwise "".
 *
 * NOTE: The running check is an in-process AppKit lookup (microseconds), so this
 *   is cheap enough to call before every use. A failure to ask is treated as
 *   "not usable" — the caller then does nothing rather than hanging.
 */
export async function usablePath(): Promise<string> {
  const path = await locate();
  if (path === "") {
    return "";
  }
  try {
    return (await betterDisplayRunning()) ? path : "";
  } catch {
    return "";
  }
}
