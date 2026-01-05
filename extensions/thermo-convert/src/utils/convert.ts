/**
 * Temperature conversion utilities
 * Supports bidirectional conversion between all major temperature scales
 */

export interface TemperatureResult {
  unit: string;
  symbol: string;
  value: number;
  formatted: string;
}

export type TemperatureUnit = "celsius" | "fahrenheit" | "kelvin" | "rankine" | "reaumur";

export const TEMPERATURE_UNITS = {
  celsius: { name: "Celsius", symbol: "°C" },
  fahrenheit: { name: "Fahrenheit", symbol: "°F" },
  kelvin: { name: "Kelvin", symbol: "K" },
  rankine: { name: "Rankine", symbol: "°R" },
  reaumur: { name: "Réaumur", symbol: "°Ré" },
};

// Conversions TO Celsius (base unit for intermediate conversion)
function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

function kelvinToCelsius(k: number): number {
  return k - 273.15;
}

function rankineToCelsius(r: number): number {
  return ((r - 491.67) * 5) / 9;
}

function reaumurToCelsius(re: number): number {
  return (re * 5) / 4;
}

// Conversions FROM Celsius
function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

function celsiusToKelvin(c: number): number {
  return c + 273.15;
}

function celsiusToRankine(c: number): number {
  return ((c + 273.15) * 9) / 5;
}

function celsiusToReaumur(c: number): number {
  return (c * 4) / 5;
}

/**
 * Convert any temperature unit to Celsius (used as intermediate step)
 */
function toCelsius(value: number, fromUnit: TemperatureUnit): number {
  switch (fromUnit) {
    case "celsius":
      return value;
    case "fahrenheit":
      return fahrenheitToCelsius(value);
    case "kelvin":
      return kelvinToCelsius(value);
    case "rankine":
      return rankineToCelsius(value);
    case "reaumur":
      return reaumurToCelsius(value);
  }
}

/**
 * Convert Celsius to any temperature unit
 */
function fromCelsius(celsius: number, toUnit: TemperatureUnit): number {
  switch (toUnit) {
    case "celsius":
      return celsius;
    case "fahrenheit":
      return celsiusToFahrenheit(celsius);
    case "kelvin":
      return celsiusToKelvin(celsius);
    case "rankine":
      return celsiusToRankine(celsius);
    case "reaumur":
      return celsiusToReaumur(celsius);
  }
}

/**
 * Parse input string to extract numeric value
 * Handles: "25", "25.5", "-10"
 */
export function parseInput(input: string): number | null {
  if (!input || input.trim() === "") {
    return null;
  }

  // Parse the number directly
  const value = parseFloat(input.trim());

  // Return null if not a valid number
  if (isNaN(value)) {
    return null;
  }

  return value;
}

/**
 * Convert from any temperature unit to all other supported scales
 */
export function convertTemperature(value: number, fromUnit: TemperatureUnit): TemperatureResult[] {
  // First convert to Celsius as intermediate step
  const celsius = toCelsius(value, fromUnit);

  // Get all units except the source unit
  const targetUnits = (Object.keys(TEMPERATURE_UNITS) as TemperatureUnit[]).filter((unit) => unit !== fromUnit);

  // Convert to all target units
  return targetUnits.map((unit) => {
    const convertedValue = fromCelsius(celsius, unit);
    const unitInfo = TEMPERATURE_UNITS[unit];
    return {
      unit: unitInfo.name,
      symbol: unitInfo.symbol,
      value: convertedValue,
      formatted: `${convertedValue.toFixed(2)} ${unitInfo.symbol}`,
    };
  });
}
