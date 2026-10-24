import { PaletteFormFields } from "../types";

/** Extracts non-empty color values from form data. */
export function extractColorValues(values: PaletteFormFields, colorCount: number): string[] {
  return Array.from(
    { length: colorCount },
    (_, index) => values[`color${index + 1}` as keyof PaletteFormFields],
  ).filter(Boolean) as string[];
}
