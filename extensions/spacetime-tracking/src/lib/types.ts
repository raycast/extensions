// `Preferences` is auto-generated globally in raycast-env.d.ts from package.json — use it directly
// via getPreferenceValues<Preferences>() (no import) so it can't drift from the manifest.

/** Time accumulated in a single space during a session. */
export interface SpaceRecord {
  /** Stable identifier used as the map key (derived from the space id). */
  key: string;
  /** Stable macOS space id, when known. */
  id?: number;
  /** Space label (currently always empty for native detection). */
  label: string;
  /** Last known global space index (1-based across displays). */
  index: number;
  /** Last known display the space belongs to. */
  display: number;
  /** Accumulated seconds. */
  seconds: number;
}

export interface Session {
  id: string;
  name: string;
  startedAt: number;
  stoppedAt?: number;
  /** Exactly one stored session may be active at a time. */
  isActive: boolean;
  /** Manually paused by the user. */
  paused: boolean;
  /** Automatically paused due to inactivity. */
  autoPaused: boolean;
  /** Timestamp (ms) of the last tracking tick; undefined resets the delta clock. */
  lastTick?: number;
  /** Timestamp (ms) of the last tick that actually recorded activity; used to backdate stop time. */
  lastActiveAt?: number;
  /** Space key the user was in at the last tick. */
  lastSpaceKey?: string;
  /** Per-space accumulated time, keyed by SpaceRecord.key. */
  spaces: Record<string, SpaceRecord>;
}

export type TrackerStatus = "idle" | "tracking" | "paused" | "auto-paused" | "other-display" | "error";
