export function formatEnergy(value: number | string | null | undefined): string {
  const number = toFiniteNumber(value);
  if (number === null) return "N/A";
  return `${(Math.abs(number) / 1000).toFixed(2)} kWh`;
}

export function formatPower(value: number | string | null | undefined, showSign = false): string {
  const number = toFiniteNumber(value);
  if (number === null) return "N/A";
  const formatted = Math.abs(number).toFixed(1);
  if (!showSign || number === 0) return `${formatted} W`;
  return `${number > 0 ? "+" : "−"}${formatted} W`;
}

export function formatCompactPower(value: number | string | null | undefined): string | undefined {
  const number = toFiniteNumber(value);
  if (number === null) return undefined;
  const absolute = Math.abs(number);
  return absolute >= 1000 ? `${(absolute / 1000).toFixed(1)} kW` : `${absolute.toFixed(0)} W`;
}

export function formatPercentage(value: number | string | null | undefined): string {
  const number = toFiniteNumber(value);
  return number === null ? "N/A" : `${number.toFixed(1)}%`;
}

export function formatMeasurement(value: number | string | null | undefined, unit: string, fractionDigits = 1): string {
  const number = toFiniteNumber(value);
  return number === null ? "N/A" : `${number.toFixed(fractionDigits)} ${unit}`;
}

export function formatBoolean(value: number | boolean | null | undefined, on: string, off: string): string {
  if (value === true || value === 1) return on;
  if (value === false || value === 0) return off;
  return "N/A";
}

export function formatTimestamp(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Unknown update time";
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}
