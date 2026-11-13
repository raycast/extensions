import type { ColorReference } from "./types";

export function parseReferenceText(text: string): ColorReference[] {
  if (!text.trim()) return [];

  return text
    .split("|")
    .map((part) => part.trim().match(/^(\d+)-(.+?)\s+(#[0-9A-Fa-f]{6})$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({
      number: match[1],
      name: match[2],
      hex: match[3].toUpperCase(),
    }));
}

export function formatReference(reference: ColorReference): string {
  return `${reference.number} ${reference.name} ${reference.hex}`;
}

export function formatPaletteHexList(references: ColorReference[]): string {
  return references.map((reference) => reference.hex).join(" ");
}

export function formatPaletteCssVariables(prefix: string, references: ColorReference[]): string {
  return references.map((reference) => `--${prefix}-${reference.number}: ${reference.hex};`).join("\n");
}
