export interface TemperatureResult {
  key: TemperatureUnit;
  name: string;
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

function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${x}`);
}

export function toCelsius(value: number, fromUnit: TemperatureUnit): number {
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
    default:
      return assertNever(fromUnit);
  }
}

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
    default:
      return assertNever(toUnit);
  }
}

export function parseInput(input: string): number | null {
  if (!input || input.trim() === "") {
    return null;
  }

  const value = parseFloat(input.trim());

  if (isNaN(value)) {
    return null;
  }

  return value;
}

export function convertTemperature(value: number, fromUnit: TemperatureUnit): TemperatureResult[] {
  const celsius = toCelsius(value, fromUnit);
  const targetUnits = (Object.keys(TEMPERATURE_UNITS) as TemperatureUnit[]).filter((unit) => unit !== fromUnit);

  return targetUnits.map((unit) => {
    const convertedValue = fromCelsius(celsius, unit);
    const unitInfo = TEMPERATURE_UNITS[unit];
    return {
      key: unit,
      name: unitInfo.name,
      symbol: unitInfo.symbol,
      value: convertedValue,
      formatted: `${convertedValue.toFixed(2)} ${unitInfo.symbol}`,
    };
  });
}
