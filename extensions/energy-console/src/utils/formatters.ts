import type { JsonPrimitive } from "../api/types";
import type { SupplyPriority } from "../types/device";

export function formatBatteryLevel(level: number | undefined): string {
  return level === undefined ? "Unknown" : `${Math.round(level)}%`;
}

export function formatPercent(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${Math.round(value)}%`;
}

export function formatSupplyPriority(value: SupplyPriority): string {
  return value === "power-supply-first" ? "Power devices first" : "Charge battery first";
}

export function formatWatts(value: number | undefined): string {
  if (value === undefined) return "Unknown";
  const absolute = Math.abs(value);
  if (absolute >= 1000) {
    const kilowatts = value / 1000;
    return `${kilowatts.toFixed(Math.abs(kilowatts) >= 10 ? 1 : 2)} kW`;
  }
  return `${Math.round(value)} W`;
}

export function formatTemperature(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${Number.isInteger(value) ? value : value.toFixed(1)} °C`;
}

export function formatZoneTemperature(current: number, target: number | undefined): string {
  return target === undefined
    ? formatTemperature(current)
    : `${formatTemperature(current)} · target ${formatTemperature(target)}`;
}

export function formatVolts(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${formatDecimal(value)} V`;
}

export function formatAmps(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${formatDecimal(value)} A`;
}

export function formatHertz(value: number | undefined): string {
  return value === undefined ? "Unknown" : `${formatDecimal(value)} Hz`;
}

export function formatMinutes(minutes: number | undefined): string {
  if (minutes === undefined) return "Unknown";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export function formatQuotaValue(value: JsonPrimitive): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function humanizeQuotaKey(key: string): string {
  const leaf = key.split(".").at(-1) ?? key;
  return leaf
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function escapeMarkdownInline(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\\/g, "\\\\")
    .replace(/([`*_[\]<>|>])/g, "\\$1");
}

function formatDecimal(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
