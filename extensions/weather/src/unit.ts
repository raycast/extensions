import { getPreferenceValues } from "@raycast/api";

export function getUnitSystem(): string {
  const pref = getPreferenceValues();
  let result = UnitSystem.Metric;
  const us = (pref.unitsystem as string) || undefined;
  if (us && (us === UnitSystem.Metric || us === UnitSystem.Imperial)) {
    result = us;
  }
  return result;
}

export function getWttrTemperaturePostfix(): string {
  if (getUnitSystem() === UnitSystem.Imperial) {
    return "F";
  } else {
    return "C";
  }
}

export function getTemperatureUnit(): string {
  if (getUnitSystem() === UnitSystem.Imperial) {
    return "°F";
  } else {
    return "°C";
  }
}

export function getWttrWindPostfix(): string {
  if (getUnitSystem() === UnitSystem.Imperial) {
    return "Miles";
  } else {
    return "Kmph";
  }
}

export function getWindUnit(): string {
  if (getUnitSystem() === UnitSystem.Imperial) {
    return "mph";
  } else {
    return "km/h";
  }
}

export enum UnitSystem {
  Metric = "metric",
  Imperial = "imperial",
}
