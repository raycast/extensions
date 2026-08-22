import { State } from "@lib/haapi";

export interface Forecast {
  condition: string;
  temperature?: number;
  templow?: number;
  datetime: string;
  wind_bearing?: number;
  wind_speed?: number;
}

export function isDailyForecast(forecast: Forecast[] | undefined): boolean {
  if (forecast && forecast.length > 1) {
    const t1 = new Date(forecast[0].datetime);
    const t2 = new Date(forecast[1].datetime);
    const delta = t2.getDate() - t1.getDate();
    if (delta === 1) {
      return true;
    }
  }
  return false;
}

export function getWindspeedFromState(state: State | undefined): string | undefined {
  if (!state) {
    return undefined;
  }
  const wind_speed = state.attributes.wind_speed as number | undefined;
  if (wind_speed !== undefined) {
    const unit = state.attributes.wind_speed_unit as string | undefined;
    const result = unit !== undefined ? `${wind_speed} ${unit}` : `${wind_speed}`;
    return result;
  }
}

export function getPressureFromState(state: State | undefined): string | undefined {
  if (!state) {
    return undefined;
  }
  const pressure = state.attributes.pressure as number | undefined;
  if (pressure !== undefined) {
    const unit = state.attributes.pressure_unit as string | undefined;
    const result = unit !== undefined ? `${pressure} ${unit}` : `${pressure}`;
    return result;
  }
}

export function getHumidityFromState(state: State | undefined): string | undefined {
  if (!state) {
    return undefined;
  }
  const humidity = state.attributes.humidity as number | undefined;
  if (humidity !== undefined) {
    return `${humidity}%`;
  }
}

export function getTemperatureFromState(state: State | undefined): string | undefined {
  if (!state) {
    return undefined;
  }
  const temp = state.attributes.temperature as number | undefined;
  if (temp !== undefined) {
    const unit = state.attributes.temperature_unit as string | undefined;
    const result = unit !== undefined ? `${temp} ${unit}` : `${temp}`;
    return result;
  }
}

export const weatherStatusToIcon: Record<string, string> = {
  "clear-night": "",
  cloudy: "☁️",
  exceptional: "",
  fog: "🌫",
  hail: "☀️",
  lightning: "🌩",
  partlycloudy: "☁️",
  pouring: "🌧",
  rainy: "🌨",
  snowy: "❄️",
  "snowy-rainy": "❄️",
  sunny: "☀️",
  windy: "💨",
  "windy-variant": "💨",
};

export function weatherConditionToIcon(condition: string): string {
  return weatherStatusToIcon[condition] || "✨";
}

const weatherStatusToText: Record<string, string> = {
  "clear-night": "Clear Night",
  cloudy: "Cloudy",
  exceptional: "Exceptional",
  fog: "Fog",
  hail: "Hail",
  lightning: "Lightning",
  partlycloudy: "Partly Cloudy",
  pouring: "Pouring",
  rainy: "Rainy",
  snowy: "Snowy",
  "snowy-rainy": "Snowy-Rainy",
  sunny: "Sunny",
  windy: "Windy",
  "windy-variant": "Windy Variant",
};

export function weatherConditionToText(condition: string): string {
  return weatherStatusToText[condition] || "❓";
}
