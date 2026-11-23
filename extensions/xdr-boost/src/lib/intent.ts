import type { HelperStatus } from "./helper";
import { clampLevel, MAX, OFF, sameLevel, stepLevel } from "./levels";

/** The All Displays level, plus each display's own level by hardware UUID (kept while it is unplugged). */
export interface Intent {
  all: number;
  levels: Record<string, number>;
}

export const NO_INTENT: Intent = { all: OFF, levels: {} };

export type Operation =
  | { kind: "all"; level: number }
  | { kind: "displays"; levels: Record<string, number> }
  | { kind: "step"; direction: 1 | -1 }
  | { kind: "toggle"; level: number }
  | { kind: "toggleDisplay"; uuid: string; level: number }
  | { kind: "restore" };

export function resolve(intent: Intent, uuid: string): number {
  return intent.levels[uuid] ?? intent.all;
}

export function boostsAnything(intent: Intent): boolean {
  return intent.all > OFF || Object.values(intent.levels).some((level) => level > OFF);
}

export function sameIntent(a: Intent, b: Intent): boolean {
  const keys = new Set([...Object.keys(a.levels), ...Object.keys(b.levels)]);
  return (
    sameLevel(a.all, b.all) &&
    [...keys].every(
      (k) => a.levels[k] !== undefined && b.levels[k] !== undefined && sameLevel(a.levels[k], b.levels[k]),
    )
  );
}

export function parseIntent(raw: unknown): Intent | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const { all, levels } = raw as { all?: unknown; levels?: unknown };
  if (typeof all !== "number" || !Number.isFinite(all)) return undefined;
  const clean: Record<string, number> = {};
  if (levels && typeof levels === "object") {
    for (const [uuid, level] of Object.entries(levels as Record<string, unknown>)) {
      if (typeof level === "number" && Number.isFinite(level)) clean[uuid] = clampLevel(level);
    }
  }
  return { all: clampLevel(all), levels: clean };
}

export interface Next {
  intent: Intent;
  /** True when the operation changed nothing for connected displays ("Already at Max" / "Already Off"). */
  saturated: boolean;
}

/** The next intent for `op`, from the SAVED intent and the UUIDs of the XDR displays connected now. */
export function computeNext(op: Operation, saved: Intent, connected: string[]): Next {
  let intent: Intent;
  let saturated = false;
  switch (op.kind) {
    case "all":
      intent = { all: clampLevel(op.level), levels: {} };
      break;
    case "displays": {
      const levels = { ...saved.levels };
      for (const [uuid, level] of Object.entries(op.levels)) levels[uuid] = clampLevel(level);
      intent = { all: saved.all, levels };
      break;
    }
    case "step": {
      // Explicit levels for every connected display, even ones already at the end: never a global reset.
      const levels = { ...saved.levels };
      saturated = connected.length > 0;
      for (const uuid of connected) {
        const from = resolve(saved, uuid);
        const to = stepLevel(from, op.direction).value;
        if (!sameLevel(to, from)) saturated = false;
        levels[uuid] = to;
      }
      intent = { all: saved.all, levels };
      break;
    }
    case "toggle":
      intent = connected.some((uuid) => resolve(saved, uuid) > OFF)
        ? { all: OFF, levels: {} }
        : { all: clampLevel(op.level), levels: {} };
      break;
    case "toggleDisplay": {
      const on = resolve(saved, op.uuid) > OFF;
      intent = { all: saved.all, levels: { ...saved.levels, [op.uuid]: on ? OFF : clampLevel(op.level) } };
      break;
    }
    case "restore":
      // Not normalized: "built-in off, an unplugged XDR covered by All Displays" would become Off everywhere.
      return { intent: { all: saved.all, levels: { ...saved.levels } }, saturated: false };
  }
  return { intent: normalize(intent, connected), saturated };
}

/** "Every connected display off, nothing unplugged boosted" is All Displays → Off. No connected displays: unchanged. */
export function normalize(intent: Intent, connected: string[]): Intent {
  if (connected.length === 0) return intent;
  const connectedSet = new Set(connected);
  const everyConnectedOff = connected.every((uuid) => resolve(intent, uuid) <= OFF);
  const unpluggedBoosted = Object.entries(intent.levels).some(
    ([uuid, level]) => !connectedSet.has(uuid) && level > OFF,
  );
  return everyConnectedOff && !unpluggedBoosted ? { all: OFF, levels: {} } : intent;
}

/** How the helper turns levels into light: the "Boost Strategy" and "External XDR Maximum" preferences. */
export interface Tuning {
  strategy: "adaptive" | "fixed";
  /** Max LIGHT gain on external XDR displays under "fixed". */
  externalMax: number;
  /** Pause on battery power below this charge percentage; 0 = never. */
  lowBattery: number;
}

/** The running helper reports exactly this tuning. */
export function matchesTuning(status: HelperStatus, tuning: Tuning): boolean {
  return (
    status.strategy === tuning.strategy &&
    typeof status.externalMax === "number" &&
    sameLevel(status.externalMax, tuning.externalMax) &&
    typeof status.lowBattery === "number" &&
    sameLevel(status.lowBattery, tuning.lowBattery)
  );
}

export function acknowledged(after: HelperStatus, intent: Intent, tuning: Tuning): boolean {
  if (!boostsAnything(intent)) return !after.running;
  return (
    after.running &&
    sameIntent({ all: after.allLevel, levels: after.levels ?? {} }, intent) &&
    matchesTuning(after, tuning)
  );
}

/** Must equal `Curve.builtInMaxGain` in the Swift helper (src/lib/__tests__/protocol.test.ts checks). */
export const BUILT_IN_MAX_GAIN = Math.pow(MAX, 2.2);

export function parseExternalMax(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > OFF ? Math.min(value, BUILT_IN_MAX_GAIN) : 2;
}

export function parseLowBattery(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 20;
}

export function parseStrategy(raw: string | undefined): Tuning["strategy"] {
  return raw === "fixed" ? "fixed" : "adaptive";
}

type Live = { running: boolean; displays: { uuid: string; level: number }[] };

/**
 * Toggles decide from what the displays are doing NOW, not from saved intent: with the helper stopped and
 * High saved, the displays show no boost, so Toggle turns it on, as its label says.
 */
export function resolveToggle(op: Operation, live: Live): Operation {
  const on = (uuid?: string) =>
    live.running && live.displays.some((d) => (uuid === undefined || d.uuid === uuid) && d.level > OFF);
  if (op.kind === "toggle") return { kind: "all", level: on() ? OFF : op.level };
  if (op.kind === "toggleDisplay") return { kind: "displays", levels: { [op.uuid]: on(op.uuid) ? OFF : op.level } };
  return op;
}

/**
 * A STALE helper (an older build, about to be stopped) can't report levels, and its stopped read-back would
 * wrongly say "off". Its toggles decide from the saved intent when there is one; with nothing saved the
 * direction is unknowable, so they fall back to "off", which `baselineLost` discloses.
 */
export function resolveOperation(op: Operation, live: Live, stale: boolean, savedKnown: boolean): Operation {
  if (!stale) return resolveToggle(op, live);
  if (savedKnown) return op;
  if (op.kind === "toggle") return { kind: "all", level: OFF };
  if (op.kind === "toggleDisplay") return { kind: "displays", levels: { [op.uuid]: OFF } };
  return op;
}

/** How replacing an older helper with no saved levels affected the operation the user invoked. */
export type BaselineLoss = "none" | "restore" | "toggle" | "change";

/** Judged on the operation as INVOKED: a stale toggle's "All Off" fallback must be disclosed, not exempted. */
export function baselineLost(invoked: Operation, stale: boolean, savedKnown: boolean): BaselineLoss {
  if (!stale || savedKnown || invoked.kind === "all") return "none";
  if (invoked.kind === "restore") return "restore";
  if (invoked.kind === "toggle" || invoked.kind === "toggleDisplay") return "toggle";
  return "change";
}
