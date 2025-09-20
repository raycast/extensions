import { getPreferenceValues, Color } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { Preference } from "../types";
const preferences = getPreferenceValues<Preference>();

// Minutes & Hours
export const minutesFormatted = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}h ${mins}m`;
};

// Feet/inches & Meters
export const metersToString = (meters: number) => `${meters} m`;
export const metersToFeetAndInches = (meters: number): string => {
  const totalFeet: number = Math.floor(meters * 3.28084);
  const inches: number = Math.round((meters * 3.28084 - totalFeet) * 12);
  return `${totalFeet}ft ${inches}in`;
};

export const convertHeight = (meters: number) => {
  if (preferences.unit_measurement === "metric") {
    return metersToString(meters);
  } else {
    return metersToFeetAndInches(meters);
  }
};

// meters to miles or kilometers
export const metersToMiles = (meters: number) => `${(meters * 0.000621371).toFixed(2)}mi`;
export const metersToKilometers = (meters: number) => `${(meters / 1000).toFixed(2)}km`;
export const convertMeters = (meters: number) => {
  if (preferences.unit_measurement === "metric") {
    return metersToKilometers(meters);
  } else {
    return metersToMiles(meters);
  }
};

// Pounds & Kilograms
export const kgToString = (kg: number) => `${kg}kg`;
export const kgToPounds = (kg: number) => `${(kg * 2.20462).toFixed(2)}lbs`;

export const convertWeight = (kg: number) => {
  if (preferences.unit_measurement === "metric") {
    return kgToString(kg);
  } else {
    return kgToPounds(kg);
  }
};

// Fahrenheit & Celsius
export const celsiusToString = (celsius: number) => `${celsius}°C`;
export const celsiusToFahrenheit = (celsius: number) => `${(celsius * 1.8).toFixed(2)}°F`;

export const convertTemperature = (celsius: number) => {
  if (preferences.unit_measurement === "metric") {
    return celsiusToString(celsius);
  } else {
    return celsiusToFahrenheit(celsius);
  }
};

// format number with commas
export const numberWithCommas = (x: number) => {
  const roundedNumber = Math.floor(x);
  return roundedNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// get a colored progress icon based on the progress value
export function getProgressStatus(progress: number) {
  let pColor = Color.Red;
  if (progress >= 90) {
    pColor = Color.Green;
  } else if (progress >= 60 && progress <= 89) {
    pColor = Color.Yellow;
  }

  const p = progress / 100;
  return getProgressIcon(p, pColor);
}
