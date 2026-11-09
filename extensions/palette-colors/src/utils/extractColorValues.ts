import { PaletteFormFields } from "../types";

/** Extracts non-empty color values from form data, trimmed. */
export function extractColorValues(values: PaletteFormFields, colorCount: number): string[] {
  return Array.from({ length: colorCount }, (_, index) =>
    String(values[`color${index + 1}` as keyof PaletteFormFields] ?? "").trim(),
  ).filter(Boolean);
}
