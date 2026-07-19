// =============================================================================
// VIRTUAL SCREEN RECONNECT
// The mechanism behind the "Fix Mirroring" command: reconnects the main
// BetterDisplay virtual screen to clear Sidecar's own mirror mode.
// -----------------------------------------------------------------------------
// Context: When the iPad connects, macOS Sidecar can bring it up mirroring at
//   the Sidecar layer — invisible to CoreGraphics and to `--mirror`. The only
//   thing that reliably clears it is disconnecting and reconnecting the main
//   BetterDisplay virtual screen, which forces macOS to redo the arrangement so
//   the iPad lands extended. This is the long-standing "Reconnect virtual
//   displays" fix. (A lighter `perform --reconfigure` was tried and does not
//   clear this mirror.)
// WARN: This briefly blanks and rearranges the desktop; it is a single off/on
//   cycle, never repeated, and only runs on request or the opt-in.
// =============================================================================

import { parseMainDisplay, tryReadCli, writeCli } from "./betterdisplaycli";

const VIRTUAL_TYPE = "VirtualScreen";

/**
 * Finds the UUID of the main display when it is a virtual screen.
 *
 * @param cliPath - Path to the `betterdisplaycli` binary.
 * @returns The main virtual screen's UUID, or null when main is a real display
 *   (or the read failed — the caller then cycles all virtual screens).
 */
async function mainVirtualScreenUuid(cliPath: string): Promise<string | null> {
  const raw = await tryReadCli(cliPath, ["get", "--displayWithMainStatus", "--identifiers"]);
  const main = parseMainDisplay(raw);
  return main?.deviceType === VIRTUAL_TYPE ? main.uuid : null;
}

/**
 * Cycles the virtual screen that drives the arrangement, once.
 *
 * @param cliPath - Path to the `betterdisplaycli` binary.
 * @param pauseMs - Delay between the disconnect and the reconnect.
 *
 * NOTE: Prefers cycling only the main virtual screen (by UUID) so other virtual
 *   screens are left alone; falls back to all virtual screens when the main
 *   display is not itself a virtual screen. Physical displays are never touched.
 * WARN: A rejected disconnect is tolerated, and the reconnect ALWAYS runs — so
 *   the virtual screen is never left disconnected, even if the disconnect step
 *   fails. Only a failed reconnect surfaces an error.
 */
export async function reconnectVirtualScreens(cliPath: string, pauseMs = 1_500): Promise<void> {
  const uuid = await mainVirtualScreenUuid(cliPath);
  const selector = uuid !== null ? [`--UUID=${uuid}`] : [`--type=${VIRTUAL_TYPE}`];

  try {
    await writeCli(cliPath, ["set", ...selector, "--connected=off"]);
    await new Promise((resolve) => setTimeout(resolve, pauseMs));
  } catch {
    // A rejected disconnect is not fatal; still reconnect so the screen returns.
  }
  await writeCli(cliPath, ["set", ...selector, "--connected=on"]);
}
