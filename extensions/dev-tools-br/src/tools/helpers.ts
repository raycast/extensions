import type { FieldDefinition, ToolValues } from "../types";
import { asBoolean, asString, clampNumber } from "../lib/shared";

export const textField = (
  name: string,
  title: string,
  placeholder?: string,
  required = true,
  defaultValue?: string,
): FieldDefinition => ({ type: "text", name, title, placeholder, required, defaultValue });

export const areaField = (name: string, title: string): FieldDefinition => ({
  type: "text",
  name,
  title,
  placeholder: "Ex.: 10",
  required: true,
});

export function stringValue(values: ToolValues, name: string, fallback = ""): string {
  return asString(values[name], fallback);
}

export function booleanValue(values: ToolValues, name: string, fallback = false): boolean {
  return asBoolean(values[name], fallback);
}

export function numberValue(
  values: ToolValues,
  name: string,
  min: number,
  max: number,
  fallback: number,
): number {
  return clampNumber(values[name], min, max, fallback);
}

export function rawNumber(values: ToolValues, name: string): number {
  const value = Number(values[name]);
  if (!Number.isFinite(value)) throw new Error(`Informe um número válido em “${name}”.`);
  return value;
}

export function simpleResult(title: string, value: string, subtitle?: string) {
  return { title, value, subtitle };
}
