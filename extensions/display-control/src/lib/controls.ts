import type { Control } from "./m1ddc";

export const controlLabels: Record<Control, string> = {
  volume: "Volume",
  luminance: "Brightness",
  contrast: "Contrast",
};
export const initialDefaults: Record<Control, number> = { volume: 20, luminance: 50, contrast: 50 };
export type ResetDefaults = Record<Control, number | undefined>;

export function parseResetDefault(input: string | undefined, fallback: number): number | undefined {
  const text = input?.trim();
  if (!text) return fallback;
  const number = text.replace(/%$/, "").trim();
  if (!/^\d{1,3}$/.test(number)) return undefined;
  const value = Number(number);
  return value <= 100 ? value : undefined;
}
