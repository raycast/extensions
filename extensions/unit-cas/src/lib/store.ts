import { getPreferenceValues } from "@raycast/api";
import { AngleMode, Context, Settings, UserFunc, calculate, decodeValue } from "../engine";

export function getSettings(angle?: AngleMode): Settings {
  const p = getPreferenceValues<Preferences>();
  return {
    mode: p.calcMode ?? "auto",
    angle: angle ?? p.angleMode ?? "rad",
    digits: Number(p.digits ?? 6),
    nspireAscii: !!p.nspireAscii,
  };
}

export interface HistoryEntry {
  input: string;
  inputLatex: string;
  inputNspire: string;
  resultLatex: string;
  resultNspire: string;
  time: number;
}

/** A stored definition, kept as Nspire source so it survives restarts ("5*_m→a", "f(x):=x^2"). */
export interface Definition {
  name: string;
  source: string;
  display: string;
  /** Exact stored value of a variable (encodeValue), independent of the display settings. */
  value?: string;
}

/** LocalStorage keys, read and written with useLocalStorage (JSON). */
export const HISTORY_KEY = "history";
export const DEFS_KEY = "definitions";
export const ANGLE_KEY = "angle";
const MAX_HISTORY = 100;

export const ANGLE_MODES: { value: AngleMode; title: string; short: string }[] = [
  { value: "rad", title: "Radian", short: "RAD" },
  { value: "deg", title: "Degree", short: "DEG" },
  { value: "grad", title: "Gradian", short: "GRAD" },
];

export const isAngleMode = (v: unknown): v is AngleMode => ANGLE_MODES.some((m) => m.value === v);

export function withHistoryEntry(list: HistoryEntry[], e: HistoryEntry): HistoryEntry[] {
  return [e, ...list.filter((h) => h.input !== e.input)].slice(0, MAX_HISTORY);
}

export function withDefinition(list: Definition[], d: Definition): Definition[] {
  return [d, ...list.filter((x) => x.name !== d.name)];
}

const FUNC_HEAD = /^([\p{L}][\p{L}\p{N}_]*)\(/u;
const isFunctionDef = (d: Definition) => FUNC_HEAD.exec(d.source)?.[1] === d.name;

/** Builds an evaluation context from stored definitions. */
export function buildContext(settings: Settings, defs: Definition[]): Context {
  const ctx: Context = { settings, vars: new Map(), funcs: new Map() };
  const replaySettings = { ...settings, mode: "auto" as const };
  // Oldest first so later definitions can use earlier ones.
  const ordered = [...defs].reverse();
  const funcs = ordered.filter(isFunctionDef);
  // Register every function name before parsing any body: otherwise f(x):=g(x)*2 replayed before g
  // would read g(x) as g·x.
  const placeholder: UserFunc = { params: [], body: { type: "bool", value: false } };
  for (const d of funcs) ctx.funcs.set(d.name, placeholder);
  for (const d of funcs) {
    const r = calculate(d.source, { ...ctx, settings: replaySettings });
    if (r.ok && r.assignment?.params && r.assignment.body)
      ctx.funcs.set(d.name, { params: r.assignment.params, body: r.assignment.body });
    else ctx.funcs.delete(d.name);
  }
  for (const d of ordered) {
    if (isFunctionDef(d)) continue;
    if (d.value) {
      try {
        ctx.vars.set(d.name, decodeValue(d.value));
        continue;
      } catch {
        // Fall back to replaying the source.
      }
    }
    const r = calculate(d.source, { ...ctx, settings: replaySettings });
    if (r.ok && r.assignment?.value) ctx.vars.set(r.assignment.name, r.assignment.value);
  }
  return ctx;
}
