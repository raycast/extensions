import type { HelperDisplay, HelperStatus } from "./helper";
import { indexOfLevel, LEVELS, OFF, presetAt, sameLevel } from "./levels";

export type AllState =
  { kind: "preset"; index: number } | { kind: "custom"; index: number } | { kind: "mixed"; index: number };

/** The highest level across displays (the menu bar dial shows it); 1.0 with no displays. */
export function highestLevel(displays: HelperDisplay[]): number {
  return displays.reduce((max, d) => Math.max(max, d.level), OFF);
}

export function allState(displays: HelperDisplay[]): AllState {
  const index = indexOfLevel(highestLevel(displays));
  if (displays.length === 0) return { kind: "preset", index: 0 };
  const first = displays[0].level;
  if (!displays.every((d) => sameLevel(d.level, first))) return { kind: "mixed", index };
  const preset = presetAt(first);
  return preset ? { kind: "preset", index: LEVELS.indexOf(preset) } : { kind: "custom", index };
}

/** "Medium", "Custom" or "Mixed" for the All Displays row. */
export function allLabel(state: AllState): string {
  if (state.kind === "preset") return LEVELS[state.index].name;
  return state.kind === "mixed" ? "Mixed" : "Custom";
}

export function shortLabel(level: number): string {
  return presetAt(level)?.name ?? "Custom";
}

// Max is "at maximum boost", not "as bright as it goes": on an external XDR, Max is the user's ceiling.
const WORDS = ["no longer boosted", "a little brighter", "brighter", "much brighter", "at maximum boost"];

function describeOne(d: HelperDisplay, plural: boolean): string {
  const subject = plural ? "Your displays are" : `${d.name} is`;
  if (d.level <= OFF) return `${subject} no longer boosted.`;
  if (d.status === "waiting" || d.status === "edr-unavailable")
    return `${plural ? "Your displays" : d.name} will brighten once ${plural ? "they allow" : "it allows"} extra brightness.`;
  if (d.status === "limited") return `${subject} as bright as ${plural ? "they" : "it"} can go right now.`;
  const words = WORDS[indexOfLevel(d.level)];
  return `${subject} ${words}.`;
}

/** Notification text after a change: relative words, never numbers. */
export function friendly(after: HelperStatus, scope: "all" | string[]): string {
  const displays = after.displays;
  if (displays.length === 0) return "No XDR display is connected, so nothing changed.";
  const paused = pauseLabel(after);
  if (paused) {
    // Saved, not applied: say when it takes effect instead of announcing brightness.
    const state = allState(displays);
    const name = state.kind === "mixed" ? "your levels" : allLabel(state);
    return `Boost set to ${name}. It applies when this ends: ${paused.replace(/^Paused: /, "")}.`;
  }
  const uniform = displays.every((d) => sameLevel(d.level, displays[0].level) && d.status === displays[0].status);
  if (uniform && (scope === "all" || displays.length > 1)) return describeOne(displays[0], displays.length > 1);
  const touched = scope === "all" ? displays : displays.filter((d) => scope.includes(d.uuid));
  return (touched.length ? touched : displays).map((d) => describeOne(d, false)).join(" ");
}

const PAUSE_LABELS: Record<string, string> = {
  "screen-saver": "Screen Saver",
  "screen-locked": "Screen Locked",
  "session-inactive": "Another User Is Active",
  "system-sleep": "Sleeping",
  "displays-asleep": "Displays Asleep",
  "low-power-mode": "Low Power Mode",
  "low-battery": "Battery Low",
};

/** "Low Power Mode", or undefined when the boost isn't paused. One reason shown, in a stable order. */
function pauseReason(status: HelperStatus): string | undefined {
  const reasons = status.running ? (status.pauseReasons ?? []) : [];
  const first = Object.keys(PAUSE_LABELS).find((reason) => reasons.includes(reason)) ?? reasons[0];
  if (first === "low-battery" && status.lowBattery) return `Battery Below ${status.lowBattery}%`;
  return first ? (PAUSE_LABELS[first] ?? first) : undefined;
}

/** "Paused: Low Power Mode", or undefined when the boost isn't paused. */
export function pauseLabel(status: HelperStatus): string | undefined {
  const reason = pauseReason(status);
  return reason ? `Paused: ${reason}` : undefined;
}

export const GAMMA_UNSUPPORTED = "Not supported on M5 Pro / M5 Max: macOS ignores the gamma boost there";

/** HUD text after a change. */
export function hud(after: HelperStatus): string {
  if (after.displays.length === 0) return "No XDR Display Found";
  if (!after.running) return "XDR Boost Off";
  const state = allState(after.displays);
  if (state.kind === "preset" && state.index === 0) return "XDR Boost Off";
  return `XDR Boost: ${allLabel(state)}${pauseLabel(after) ? " (Paused)" : ""}`;
}

/** Toggle XDR Boost's root-search subtitle: "Off", "On · High" or "On · High · Screen Locked". */
export function statusSubtitle(status: HelperStatus): string {
  if (status.displays.length === 0) return "No XDR Display";
  const state = allState(status.displays);
  if (!status.running || (state.kind === "preset" && state.index === 0)) return "Off";
  const detail = status.gammaSupported === false ? "No Effect on This Mac" : pauseReason(status);
  return ["On", allLabel(state), detail].filter(Boolean).join(" · ");
}

/** The per-display rows both AI tools return. */
export function toolDisplays(displays: HelperDisplay[]) {
  return displays.map((d) => ({
    id: d.uuid,
    name: d.name,
    level: d.level,
    levelName: shortLabel(d.level),
    effectiveLevel: d.effectiveLevel,
    status: d.status,
  }));
}

/** The one display `query` names, by id first, then by name (both case-insensitive). Throws with the list otherwise. */
export function matchDisplay(displays: HelperDisplay[], query: string): HelperDisplay {
  const wanted = query.toLowerCase();
  const byId = displays.filter((d) => d.uuid.toLowerCase() === wanted);
  const matches = byId.length ? byId : displays.filter((d) => d.name.toLowerCase() === wanted);
  const listed = displays.map((d) => `${d.name} (id ${d.uuid})`).join(", ") || "none";
  if (matches.length === 0) throw new Error(`No XDR display matches "${query}". Connected: ${listed}.`);
  if (matches.length > 1)
    throw new Error(`More than one display is named "${query}"; pass its id. Connected: ${listed}.`);
  return matches[0];
}
