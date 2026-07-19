// =============================================================================
// NATIVE BACKEND
// A SidecarBackend implemented over the bundled Swift helper.
// -----------------------------------------------------------------------------
// Context: No BetterDisplay dependency. The Swift functions (compiled from
//   swift/ by extensions-swift-tools) connect/disconnect via the private
//   SidecarCore framework and read/set mirror state via public CoreGraphics.
//   macOS runs one Sidecar session at a time, so link and display state are
//   keyed off "the Sidecar display" rather than a specific device.
// WARN: The helper never reassigns the main display and never disconnects a
//   display; it only reconfigures the Sidecar display's mirror state.
// =============================================================================

import { connect, disconnect, extend, listDevices, mirror, status } from "swift:../../swift";

import { SidecarError } from "./backend";

import type { SidecarBackend, SidecarDevice } from "./backend";

/** The Sidecar display's presence and state, as the helper reports it. */
interface Status {
  readonly present: boolean;
  readonly main: boolean;
  readonly mirrored: boolean;
}

/**
 * Invokes a Swift helper function, wrapping any failure as a SidecarError.
 *
 * @param label - Short action name for the error message.
 * @param fn    - The Swift call to run.
 * @returns Whatever the Swift function resolves to.
 */
async function call<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new SidecarError(`native ${label} failed: ${detail}`);
  }
}

/**
 * Reads and normalises the Sidecar display status.
 *
 * @returns Whether a Sidecar display is present and its main/mirror state.
 */
async function readStatus(): Promise<Status> {
  const raw = await call("read status", () => status());
  return { present: raw.present === true, main: raw.main === true, mirrored: raw.mirrored === true };
}

/**
 * Builds a SidecarBackend backed by the native Swift helper.
 *
 * @returns The Native engine.
 */
export function createNativeBackend(): SidecarBackend {
  return {
    async listDevices(): Promise<readonly SidecarDevice[]> {
      const names = await call("list devices", () => listDevices());
      // Native has no separate UUID; the device name is the stable identifier.
      return names
        .filter((name): name is string => typeof name === "string")
        .map((name) => ({ name, uuid: name }));
    },

    async isConnected(): Promise<boolean> {
      return (await readStatus()).present;
    },

    async setConnected(ipadName: string, connected: boolean): Promise<void> {
      await call(connected ? "connect" : "disconnect", () =>
        connected ? connect(ipadName) : disconnect(ipadName),
      );
    },

    async readMirror(): Promise<boolean | null> {
      const state = await readStatus();
      return state.present ? state.mirrored : null;
    },

    async isIpadMain(): Promise<boolean> {
      const state = await readStatus();
      return state.present && state.main;
    },

    async extend(): Promise<void> {
      await call("extend", () => extend());
    },

    async mirrorToMain(): Promise<void> {
      await call("mirror", () => mirror());
    },
  };
}
