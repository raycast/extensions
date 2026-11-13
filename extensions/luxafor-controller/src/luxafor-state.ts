// Only API acceptance is recorded. Nothing in this module observes the physical LED.
export const BASE_COLOURS = {
  red: "ff0000",
  green: "00ff00",
  yellow: "ffff00",
  blue: "0000ff",
  white: "ffffff",
  cyan: "00ffff",
  magenta: "ff00ff",
} as const;
export type BaseColour = keyof typeof BASE_COLOURS;
export type Command = { kind: "solid" | "blink"; colour: string };
export type Failure =
  "configuration" | "busy" | "storage" | "http" | "application" | "response" | "timeout" | "network" | "cancelled";
export type Attempt = {
  command: Command;
  startedAt: number;
  finishedAt?: number;
  outcome: "pending" | "accepted" | "failed" | "uncertain";
  reason?: Failure;
};
export type SavedState = {
  version: 2;
  accepted?: { command: Command; acceptedAt: number };
  attempt?: Attempt;
  recent: string[];
  legacyColour?: string;
};
export interface StateStore {
  read(): Promise<SavedState>;
  write(state: SavedState): Promise<void>;
}
export const emptyState = (): SavedState => ({ version: 2, recent: [] });
export const isBaseColour = (value: string): value is BaseColour => Object.hasOwn(BASE_COLOURS, value);

export function normaliseHex(input: string): string | undefined {
  const value = input.trim().replace(/^#/, "");
  if (!/^(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(value)) return undefined;
  return (value.length === 3 ? [...value].map((c) => c + c).join("") : value).toLowerCase();
}

export function validCommand(value: unknown): value is Command {
  if (!value || typeof value !== "object") return false;
  const c = value as Command;
  return (
    (c.kind === "blink" && typeof c.colour === "string" && isBaseColour(c.colour)) ||
    (c.kind === "solid" &&
      typeof c.colour === "string" &&
      (isBaseColour(c.colour) || c.colour === "off" || /^[a-f\d]{6}$/.test(c.colour)))
  );
}

export function colourHex(colour: string): string {
  return isBaseColour(colour) ? BASE_COLOURS[colour] : colour === "off" ? "000000" : colour;
}

export function colourLabel(colour: string): string {
  if (colour === "off" || colour === "000000") return "Off";
  const name = Object.entries(BASE_COLOURS).find(([, hex]) => hex === colour)?.[0];
  const label = name ?? colour;
  return isBaseColour(label) ? label[0].toUpperCase() + label.slice(1) : `#${label.toUpperCase()}`;
}
export const commandLabel = (command: Command) =>
  `${command.kind === "blink" ? "Blink " : ""}${colourLabel(command.colour)}`;
const timestamp = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= Date.now() + 60_000;
const failures: Failure[] = [
  "configuration",
  "busy",
  "storage",
  "http",
  "application",
  "response",
  "timeout",
  "network",
  "cancelled",
];
const cleanCommand = (command: Command): Command => ({ kind: command.kind, colour: command.colour });

// Reconstruct an allowlisted record: never retain arbitrary legacy messages, URLs or identifiers.
export function decodeState(raw: unknown, legacy?: unknown): SavedState {
  const state = emptyState();
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : undefined;
    if (data?.version === 2) {
      if (validCommand(data.accepted?.command) && timestamp(data.accepted?.acceptedAt)) {
        state.accepted = { command: cleanCommand(data.accepted.command), acceptedAt: data.accepted.acceptedAt };
      }
      const a = data.attempt;
      if (
        validCommand(a?.command) &&
        timestamp(a?.startedAt) &&
        ["pending", "accepted", "failed", "uncertain"].includes(a?.outcome)
      ) {
        state.attempt = { command: cleanCommand(a.command), startedAt: a.startedAt, outcome: a.outcome };
        if (timestamp(a.finishedAt)) state.attempt.finishedAt = a.finishedAt;
        if (failures.includes(a.reason)) state.attempt.reason = a.reason;
      }
      if (Array.isArray(data.recent))
        state.recent = [
          ...new Set<string>(data.recent.filter((c: unknown) => typeof c === "string" && /^[a-f\d]{6}$/.test(c))),
        ].slice(0, 5);
      if (typeof data.legacyColour === "string" && /^[a-f\d]{6}$/.test(data.legacyColour))
        state.legacyColour = data.legacyColour;
      return state;
    }
    // Unknown future versions must not be interpreted as legacy success.
    if (data) return state;
  } catch {
    /* Corrupt new data may still have a useful old colour choice. */
  }
  try {
    const old = typeof legacy === "string" ? JSON.parse(legacy) : undefined;
    for (const colour of [old?.selectedColor, old?.currentColor]) {
      if (typeof colour !== "string") continue;
      const hex = isBaseColour(colour) ? BASE_COLOURS[colour] : colour === "off" ? "000000" : normaliseHex(colour);
      if (hex) {
        state.legacyColour = hex;
        break;
      }
    }
  } catch {
    /* Invalid legacy state is unknown, never online/offline. */
  }
  return state;
}

export function stateSummary(state: SavedState, now = Date.now()): string {
  const accepted = state.accepted;
  if (!accepted) return "No API-accepted command · physical state unknown";
  const stale = now - accepted.acceptedAt > 5 * 60_000 ? " · stale history" : "";
  return `Last API-accepted: ${commandLabel(accepted.command)} · ${new Date(accepted.acceptedAt).toLocaleString()}${stale}`;
}

export function attemptSummary(state: SavedState, now = Date.now()): string {
  const attempt = state.attempt;
  if (!attempt) return "Physical device state is unknown";
  if (attempt.outcome === "pending")
    return now - attempt.startedAt > 12_000
      ? "Interrupted request · delivery unknown"
      : "Request pending · physical state unknown";
  if (attempt.outcome === "accepted") return "HTTP 200 with JSON · physical state unknown";
  return attempt.outcome === "uncertain"
    ? "Last request delivery uncertain · check the light before resending"
    : "Last request failed · previous accepted command preserved";
}
