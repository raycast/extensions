export interface Level {
  name: string;
  value: number;
}

/** Off plus four preset boost levels, evenly spaced up to 1.75 (Headroom's levels). */
export const LEVELS: readonly Level[] = [
  { name: "Off", value: 1.0 },
  { name: "Low", value: 1.1875 },
  { name: "Medium", value: 1.375 },
  { name: "High", value: 1.5625 },
  { name: "Max", value: 1.75 },
];

export const OFF = 1.0;
export const MAX = 1.75;

export const EPSILON = 1e-9;

export function sameLevel(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

const PREFERENCE_KEYS: Record<string, number> = { low: 1, medium: 2, high: 3, max: 4 };

export function levelFromPreference(key: string | undefined): Level {
  return LEVELS[PREFERENCE_KEYS[key ?? ""] ?? 3];
}

export function clampLevel(value: number): number {
  return Math.min(Math.max(value, OFF), MAX);
}

export function presetAt(value: number | undefined): Level | undefined {
  if (value === undefined || value <= OFF) return LEVELS[0];
  return LEVELS.slice(1).find((level) => sameLevel(level.value, value));
}

export function indexOfLevel(value: number | undefined): number {
  if (value === undefined || value <= OFF) return 0;
  let best = 0;
  for (let i = 1; i < LEVELS.length; i++) {
    if (Math.abs(LEVELS[i].value - value) < Math.abs(LEVELS[best].value - value)) best = i;
  }
  return best;
}

export function stepLevel(value: number | undefined, direction: 1 | -1): Level {
  const v = value === undefined ? OFF : clampLevel(value);
  if (direction === 1) return LEVELS.find((level) => level.value > v + EPSILON) ?? LEVELS[LEVELS.length - 1];
  return [...LEVELS].reverse().find((level) => level.value < v - EPSILON) ?? LEVELS[0];
}

export function levelLabel(value: number): string {
  const preset = presetAt(value);
  if (preset) return preset.value <= OFF ? preset.name : `${preset.name} ${preset.value.toFixed(2)}`;
  const short = value.toFixed(2);
  const exact = String(Number(value.toFixed(4)));
  return `Custom ${Number(short) === Number(exact) ? short : exact}`;
}

export function parseLevel(input: string): number | undefined {
  const text = input.trim().toLowerCase();
  if (!text) return undefined;
  const preset = LEVELS.find((level) => level.name.toLowerCase() === text);
  if (preset) return preset.value;
  const percent = /^(\d+(?:\.\d+)?)\s*%$/.exec(text);
  const value = percent ? OFF + (Number(percent[1]) / 100) * (MAX - OFF) : Number(text);
  if (!Number.isFinite(value) || value < OFF || value > MAX) return undefined;
  return value;
}
