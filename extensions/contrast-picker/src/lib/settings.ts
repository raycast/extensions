import { getPreferenceValues } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { FONT_WEIGHTS, FontWeight } from "./contrast";

export const DEFAULT_SIZE = 16;
export const DEFAULT_WEIGHT: FontWeight = 400;

export function getPreferences() {
  return getPreferenceValues<Preferences>();
}

/** Remembers the last font size and weight between runs. */
export function useFontSettings() {
  const size = useLocalStorage<number>("font-size", DEFAULT_SIZE);
  const weight = useLocalStorage<number>("font-weight", DEFAULT_WEIGHT);
  return {
    isLoading: size.isLoading || weight.isLoading,
    sizePx: sanitizeSize(size.value),
    weight: sanitizeWeight(weight.value),
    setSize: (value: number) => size.setValue(sanitizeSize(value)),
    setWeight: (value: number) => weight.setValue(sanitizeWeight(value)),
  };
}

export function sanitizeSize(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 6 && number <= 200 ? number : DEFAULT_SIZE;
}

export function sanitizeWeight(value: unknown): FontWeight {
  const number = Number(value);
  return (FONT_WEIGHTS as number[]).includes(number) ? (number as FontWeight) : DEFAULT_WEIGHT;
}
