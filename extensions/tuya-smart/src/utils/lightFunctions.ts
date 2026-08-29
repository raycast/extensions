import { Device, FunctionItem } from "./interfaces";

/** Tuya data point codes for dimmable / tunable lights, newest revision first. */
export const BRIGHTNESS_CODES = ["bright_value_v2", "bright_value"];
export const COLOR_TEMP_CODES = ["temp_value_v2", "temp_value"];

export interface Range {
  min: number;
  max: number;
  step: number;
}

const DEFAULT_RANGE: Range = { min: 0, max: 1000, step: 1 };

/**
 * Tuya reports an Integer data point's bounds as a JSON string, e.g.
 * `{"min":10,"max":1000,"scale":0,"step":1}`. Bounds differ per product, so they
 * must be read from the device rather than assumed.
 */
export function parseRange(values?: string): Range {
  if (!values) return DEFAULT_RANGE;
  try {
    const parsed = JSON.parse(values) as Partial<Range>;
    const min = typeof parsed.min === "number" ? parsed.min : DEFAULT_RANGE.min;
    const max = typeof parsed.max === "number" ? parsed.max : DEFAULT_RANGE.max;
    const step = typeof parsed.step === "number" && parsed.step > 0 ? parsed.step : DEFAULT_RANGE.step;
    return max > min ? { min, max, step } : DEFAULT_RANGE;
  } catch {
    return DEFAULT_RANGE;
  }
}

/**
 * An Enum data point declares its options in the same `values` field, as
 * `{"range":["open","stop","close"]}`. A curtain's Open/Stop/Close and a light's work
 * modes are both read from here, so the options offered are the ones the product itself
 * reports rather than a hardcoded list per category.
 */
export function parseEnumOptions(values?: string): string[] {
  if (!values) return [];
  try {
    const parsed = JSON.parse(values) as { range?: unknown };
    if (!Array.isArray(parsed.range)) return [];
    return parsed.range.filter((option): option is string => typeof option === "string" && option.length > 0);
  } catch {
    return [];
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function percentToRaw(percent: number, range: Range): number {
  const ratio = clamp(percent, 0, 100) / 100;
  const raw = range.min + (range.max - range.min) * ratio;
  const stepped = range.min + Math.round((raw - range.min) / range.step) * range.step;
  return clamp(Math.round(stepped), range.min, range.max);
}

export function rawToPercent(raw: number, range: Range): number {
  if (range.max === range.min) return 0;
  return clamp(Math.round(((raw - range.min) / (range.max - range.min)) * 100), 0, 100);
}

/** Finds the first supported data point from a preference-ordered list of codes. */
export function findFunction(device: Device, codes: string[]): FunctionItem | undefined {
  const status = device.status ?? [];
  for (const code of codes) {
    const match = status.find((item) => item.code === code);
    if (match) return match;
  }
  return undefined;
}

export const findBrightness = (device: Device) => findFunction(device, BRIGHTNESS_CODES);
export const findColorTemp = (device: Device) => findFunction(device, COLOR_TEMP_CODES);
