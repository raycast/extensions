export type HeightUnit = "ft" | "m";
export type WindSpeedUnit = "kts" | "kph" | "ms";
export type TemperatureUnit = "F" | "C";

export interface UnitPreferences {
  windSpeedUnit: WindSpeedUnit;
  surfHeightUnit: HeightUnit;
  swellHeightUnit: HeightUnit;
  tideHeightUnit: HeightUnit;
  temperatureUnit: TemperatureUnit;
}

export function convertHeight(value: number, from: HeightUnit, to: HeightUnit): number {
  if (from === to) return value;
  return from === "ft" ? Math.round(value * 0.3048 * 10) / 10 : Math.round((value / 0.3048) * 10) / 10;
}

export function convertTemp(value: number, from: TemperatureUnit, to: TemperatureUnit): number {
  if (from === to) return value;
  return from === "F" ? Math.round(((value - 32) * 5) / 9) : Math.round((value * 9) / 5 + 32);
}

export function convertWindSpeed(value: number, from: WindSpeedUnit, to: WindSpeedUnit): number {
  if (from === to) return value;
  // Convert to knots first as base unit
  let kts = value;
  if (from === "kph") kts = value / 1.852;
  if (from === "ms") kts = value / 0.514444;

  // Convert from knots to target unit
  switch (to) {
    case "kts":
      return Math.round(kts);
    case "kph":
      return Math.round(kts * 1.852);
    case "ms":
      return Math.round(kts * 0.514444 * 10) / 10;
  }
}

export function getUnitLabel(unit: HeightUnit | WindSpeedUnit | TemperatureUnit): string {
  switch (unit) {
    case "ft":
      return "ft";
    case "m":
      return "m";
    case "kts":
      return "kts";
    case "kph":
      return "km/h";
    case "ms":
      return "m/s";
    case "F":
      return "°F";
    case "C":
      return "°C";
    default:
      return unit;
  }
}

export function formatHeight(value: number, unit: HeightUnit, fromUnit: HeightUnit = "ft"): string {
  const converted = fromUnit === unit ? value : convertHeight(value, fromUnit, unit);
  return `${converted}${getUnitLabel(unit)}`;
}

export function formatTemp(value: number, unit: TemperatureUnit, fromUnit: TemperatureUnit = "F"): string {
  const converted = fromUnit === unit ? value : convertTemp(value, fromUnit, unit);
  return `${converted}${getUnitLabel(unit)}`;
}

export function formatWindSpeed(value: number, unit: WindSpeedUnit, fromUnit: WindSpeedUnit = "kts"): string {
  const converted = fromUnit === unit ? value : convertWindSpeed(value, fromUnit, unit);
  return `${converted}${getUnitLabel(unit)}`;
}
