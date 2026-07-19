// =============================================================================
// SIDECAR ORCHESTRATION
// Connects an iPad over Sidecar and settles it into extend or mirror mode.
// -----------------------------------------------------------------------------
// Context: Engine-agnostic — every hardware touch goes through a SidecarBackend,
//   so this module is unit-testable against a mock. macOS spends about a second
//   rearranging a freshly connected display (often mirrored first), so the mode
//   is re-asserted until it holds correct across several reads, not set once.
// WARN: The main display is never written, and no display is ever disconnected
//   or cycled. The only mode writes are detaching the iPad from a mirror set
//   (extend) or folding it into the current main's set (mirror), and both are
//   skipped when the iPad itself is the main display.
// =============================================================================

import { SidecarError } from "./backend";

import type { DisplayMode, SidecarBackend } from "./backend";

const POLL_INTERVAL_MS = 400;

// The desired mode must read correct this many times in a row before we call it
// settled. macOS spends about a second rearranging a freshly connected Sidecar
// display (it often comes up mirrored, then flips), so a single confirming read
// can be a transient; holding across several reads outlasts that window.
const REQUIRED_STABLE_READS = 3;

/** What a command needs beyond the backend: the device and timing. */
export interface SidecarConfig {
  readonly ipadName: string;
  readonly mode: DisplayMode;
  readonly settleTimeoutMs: number;
}

/** What the display-mode step did, or why it safely declined to act. */
export interface ModeOutcome {
  /**
   * Whether a mode write was issued. A deliberate test-facing observable: it is
   * how the hardware suites assert write-minimisation (they cannot see the mock's
   * call log), so it stays even though no production path branches on it.
   */
  readonly changed: boolean;
  readonly settled: boolean;
  readonly skippedReason?: string;
  /** True only when this call newly attached the Sidecar link (a fresh connect). */
  readonly linkEstablished?: boolean;
}

// -----------------------------------------------------------
// POLLING HELPERS
// -----------------------------------------------------------

/**
 * Polls a predicate until it holds or the budget runs out.
 *
 * @param probe     - Async check; resolves true once the desired state is live.
 * @param timeoutMs - Total time to keep polling.
 * @returns True if the predicate held before the deadline.
 */
async function pollUntil(probe: () => Promise<boolean>, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await probe()) {
      return true;
    }
    if (Date.now() >= deadline) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Resolves which iPad to act on, preferring an explicit override.
 *
 * @param backend  - The engine.
 * @param override - Name from preferences/selection; empty means auto-detect.
 * @returns The Sidecar device name to act on.
 *
 * WARN: A device list includes paired-but-unreachable devices, so a returned
 *   name is not a promise that the iPad can connect.
 */
export async function resolveIpadName(backend: SidecarBackend, override: string): Promise<string> {
  const pinned = override.trim();
  if (pinned !== "") {
    return pinned;
  }

  const devices = await backend.listDevices();
  const only = devices[0];
  if (only === undefined) {
    throw new SidecarError("No Sidecar devices found. Is your iPad signed in to the same Apple ID?");
  }
  if (devices.length > 1) {
    const names = devices.map((device) => device.name).join(", ");
    throw new SidecarError(`Multiple Sidecar devices found (${names}). Set “iPad Name” in preferences.`);
  }
  return only.name;
}

// -----------------------------------------------------------
// DISPLAY MODE
// -----------------------------------------------------------

/**
 * Brings the iPad into the requested display mode and holds it there.
 *
 * @param backend - The engine.
 * @param config  - Resolved configuration.
 * @returns Whether a change was made and whether it settled, or the reason the
 *   step was skipped.
 *
 * NOTE: Re-asserts the mode whenever a read disagrees, and only reports settled
 *   once the mode has read correct several times running — this outlasts the
 *   second or so macOS spends rearranging a freshly connected display, during
 *   which it often reports mirrored before flipping. No display is ever cycled,
 *   and the main display is never written. If the iPad's display never appears,
 *   nothing is written and this throws; if the iPad is the main display, the
 *   mode is left untouched.
 */
export async function ensureDisplayMode(
  backend: SidecarBackend,
  config: SidecarConfig,
): Promise<ModeOutcome> {
  const wantMirror = config.mode === "mirror";
  const deadline = Date.now() + config.settleTimeoutMs;

  let changed = false;
  let everPresent = false;
  let stableReads = 0;

  for (;;) {
    const current = await backend.readMirror(config.ipadName);

    if (current !== null) {
      everPresent = true;

      if (await backend.isIpadMain(config.ipadName)) {
        return {
          changed,
          settled: false,
          skippedReason: "it's the main display; mode left as-is",
        };
      }

      if (current === wantMirror) {
        stableReads += 1;
        if (stableReads >= REQUIRED_STABLE_READS) {
          return { changed, settled: true };
        }
      } else {
        if (wantMirror) {
          await backend.mirrorToMain(config.ipadName);
        } else {
          await backend.extend(config.ipadName);
        }
        changed = true;
        stableReads = 0;
      }
    }

    if (Date.now() >= deadline) {
      if (!everPresent) {
        throw new SidecarError(
          `The iPad display “${config.ipadName}” is not stably present; made no display changes.`,
        );
      }
      return { changed, settled: false };
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// -----------------------------------------------------------
// LINK CONTROL
// -----------------------------------------------------------

/**
 * Attaches the iPad, confirms its display is stable, then settles the mode.
 *
 * @param backend - The engine.
 * @param config  - Resolved configuration.
 * @returns The outcome of the display-mode step.
 *
 * NOTE: Idempotent. The link write is skipped when already connected. If the
 *   link never comes up, or the display never stabilises, this throws before any
 *   display write happens.
 */
export async function connectSidecar(backend: SidecarBackend, config: SidecarConfig): Promise<ModeOutcome> {
  let linkEstablished = false;

  if (!(await backend.isConnected(config.ipadName))) {
    await backend.setConnected(config.ipadName, true);

    const linked = await pollUntil(() => backend.isConnected(config.ipadName), config.settleTimeoutMs);
    if (!linked) {
      throw new SidecarError("Sidecar did not connect. Is the iPad awake and nearby?");
    }
    linkEstablished = true;
  }

  const outcome = await ensureDisplayMode(backend, config);
  return { ...outcome, linkEstablished };
}

/**
 * Detaches the iPad and waits for the link to drop.
 *
 * @param backend - The engine.
 * @param config  - Resolved configuration.
 *
 * NOTE: Idempotent. Returns immediately when the link is already down.
 */
export async function disconnectSidecar(backend: SidecarBackend, config: SidecarConfig): Promise<void> {
  if (!(await backend.isConnected(config.ipadName))) {
    return;
  }

  await backend.setConnected(config.ipadName, false);

  const dropped = await pollUntil(
    async () => !(await backend.isConnected(config.ipadName)),
    config.settleTimeoutMs,
  );
  if (!dropped) {
    throw new SidecarError("Sidecar did not disconnect.");
  }
}

/**
 * Reports whether the iPad is currently attached.
 *
 * @param backend - The engine.
 * @param config  - Resolved configuration.
 * @returns True when the Sidecar link is up.
 */
export async function isConnected(backend: SidecarBackend, config: SidecarConfig): Promise<boolean> {
  return backend.isConnected(config.ipadName);
}
