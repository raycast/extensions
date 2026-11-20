import { Me } from "../types";

export interface IdleOption {
  title: string;
  value: string;
}

// The choices for accounts with manual lifecycle, which may set any time from 120 s to 24 h, or 0.
const MANUAL_IDLE_SECONDS = [0, 300, 900, 1800, 3600, 7200, 14400];

// What the API gives a machine when the account cannot choose and `fixedAutoSuspendSeconds` is absent.
const DEFAULT_IDLE_SECONDS = 1800;

/** "Never", "After 5 Minutes", "After 2 Hours" */
export function idleTitle(seconds: number) {
  if (seconds === 0) return "Never";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60 || minutes % 60 !== 0) return `After ${minutes} Minute${minutes === 1 ? "" : "s"}`;
  const hours = minutes / 60;
  return `After ${hours} Hour${hours === 1 ? "" : "s"}`;
}

/**
 * The idle pause times the account may pick. Empty when InstaBox fixes it: the API then ignores
 * `autoSuspendAfterSeconds`, and without manual lifecycle it snaps a request to `idleChoicesSeconds`.
 */
export function idleOptions(me: Me): IdleOption[] {
  const seconds = me.manualLifecycle
    ? MANUAL_IDLE_SECONDS
    : [...(me.alwaysOnAllowed && me.idleChoicesSeconds?.length ? [0] : []), ...(me.idleChoicesSeconds ?? [])];
  return seconds.map((value) => ({ title: idleTitle(value), value: String(value) }));
}

/** The idle pause every machine of an account without a choice gets. */
export function fixedIdleSeconds(me: Me) {
  return me.fixedAutoSuspendSeconds ?? DEFAULT_IDLE_SECONDS;
}

/** 30 minutes when offered, else the longest option. */
export function defaultIdleValue(options: IdleOption[]) {
  return options.find((option) => option.value === String(DEFAULT_IDLE_SECONDS))?.value ?? options.at(-1)?.value;
}
