// =============================================================================
// SIDECAR BACKEND
// The engine interface the orchestration talks to, plus shared types.
// -----------------------------------------------------------------------------
// Context: Two engines implement this — BetterDisplay (the `betterdisplaycli`
//   wrapper) and Native (a bundled SidecarCore + CoreGraphics helper). The
//   orchestration depends only on this interface, so it is engine-agnostic and
//   can be unit-tested against a mock.
// WARN: No method may write the main display or disconnect/cycle a display. The
//   only mutations are the Sidecar link and adding/removing the iPad from a
//   mirror set, with the current main kept as the mirror master.
// =============================================================================

/** How the iPad should sit in the display arrangement once connected. */
export type DisplayMode = "extend" | "mirror";

/** A Sidecar-capable device. */
export interface SidecarDevice {
  readonly name: string;
  readonly uuid: string;
}

/** Raised when an engine cannot run or a request is rejected. */
export class SidecarError extends Error {}

/**
 * The operations an engine must provide, all keyed by the iPad's device name.
 *
 * Each engine hides its own identifier scheme (BetterDisplay names/UUIDs, or
 * CoreGraphics display IDs) behind these methods.
 */
export interface SidecarBackend {
  /** Lists every paired Sidecar device (present or not). */
  listDevices(): Promise<readonly SidecarDevice[]>;

  /** Whether the named iPad's Sidecar link is currently up. */
  isConnected(ipadName: string): Promise<boolean>;

  /** Attaches or detaches the named iPad. Not required to be idempotent. */
  setConnected(ipadName: string, connected: boolean): Promise<void>;

  /**
   * Whether the iPad's display is part of a mirror set.
   *
   * @returns `true`/`false`, or `null` when the iPad's display is not present.
   */
  readMirror(ipadName: string): Promise<boolean | null>;

  /** Whether macOS currently treats the iPad as the main display. */
  isIpadMain(ipadName: string): Promise<boolean>;

  /** Detaches the iPad from any mirror set (extend). A no-op when extended. */
  extend(ipadName: string): Promise<void>;

  /** Folds the iPad into the current main display's mirror set (mirror). */
  mirrorToMain(ipadName: string): Promise<void>;
}
