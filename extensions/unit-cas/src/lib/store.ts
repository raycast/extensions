import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { AngleMode, Context, Settings, calculate } from "../engine";

export interface Preferences {
  calcMode: "auto" | "exact" | "approx";
  angleMode: AngleMode;
  digits: string;
  primaryCopy: "latex" | "nspire";
  nspireAscii: boolean;
  renderMath: boolean;
}

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
}

const HISTORY_KEY = "history";
const ANGLE_KEY = "angleMode";

export const ANGLE_MODES: { value: AngleMode; title: string; short: string }[] = [
  { value: "rad", title: "Radian", short: "RAD" },
  { value: "deg", title: "Degree", short: "DEG" },
  { value: "grad", title: "Gradian", short: "GRAD" },
];

/** The angle mode chosen in the command, falling back to the preference. */
export async function loadAngleMode(): Promise<AngleMode> {
  const saved = await LocalStorage.getItem<string>(ANGLE_KEY);
  if (saved && ANGLE_MODES.some((m) => m.value === saved)) return saved as AngleMode;
  return getPreferenceValues<Preferences>().angleMode ?? "rad";
}

export async function saveAngleMode(mode: AngleMode): Promise<void> {
  await LocalStorage.setItem(ANGLE_KEY, mode);
}
const DEFS_KEY = "definitions";
const MAX_HISTORY = 100;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await LocalStorage.getItem<string>(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const loadHistory = () => readJson<HistoryEntry[]>(HISTORY_KEY, []);
export const loadDefinitions = () => readJson<Definition[]>(DEFS_KEY, []);

export async function addHistory(e: HistoryEntry): Promise<HistoryEntry[]> {
  const list = (await loadHistory()).filter((h) => h.input !== e.input);
  const next = [e, ...list].slice(0, MAX_HISTORY);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function removeHistory(input: string | null): Promise<HistoryEntry[]> {
  const next = input === null ? [] : (await loadHistory()).filter((h) => h.input !== input);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function saveDefinition(d: Definition): Promise<Definition[]> {
  const next = [d, ...(await loadDefinitions()).filter((x) => x.name !== d.name)];
  await LocalStorage.setItem(DEFS_KEY, JSON.stringify(next));
  return next;
}

export async function removeDefinition(name: string | null): Promise<Definition[]> {
  const next = name === null ? [] : (await loadDefinitions()).filter((x) => x.name !== name);
  await LocalStorage.setItem(DEFS_KEY, JSON.stringify(next));
  return next;
}

/** Builds an evaluation context by replaying stored definitions in order. */
export function buildContext(settings: Settings, defs: Definition[]): Context {
  const ctx: Context = { settings, vars: new Map(), funcs: new Map() };
  // Oldest first so later definitions can use earlier ones.
  for (const d of [...defs].reverse()) {
    const r = calculate(d.source, { ...ctx, settings: { ...settings, mode: "auto" } });
    if (!r.ok || !r.assignment) continue;
    const a = r.assignment;
    if (a.params && a.body) ctx.funcs.set(a.name, { params: a.params, body: a.body });
    else if (a.value) ctx.vars.set(a.name, a.value);
  }
  return ctx;
}
