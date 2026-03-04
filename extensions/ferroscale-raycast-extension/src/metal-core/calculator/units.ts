import type { LengthUnit } from "./types";

const MM_PER_UNIT: Record<LengthUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
};

const KG_PER_LB = 0.45359237;
const LB_PER_KG = 1 / KG_PER_LB;

export function toMillimeters(value: number, unit: LengthUnit): number {
  return value * MM_PER_UNIT[unit];
}

export function fromMillimeters(valueMm: number, unit: LengthUnit): number {
  return valueMm / MM_PER_UNIT[unit];
}

export function kilogramsToPounds(valueKg: number): number {
  return valueKg * LB_PER_KG;
}

export function poundsToKilograms(valueLb: number): number {
  return valueLb * KG_PER_LB;
}

export function millimetersToMeters(valueMm: number): number {
  return valueMm / 1000;
}

export function metersToFeet(valueM: number): number {
  return fromMillimeters(valueM * 1000, "ft");
}

export function feetToMeters(valueFt: number): number {
  return toMillimeters(valueFt, "ft") / 1000;
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
