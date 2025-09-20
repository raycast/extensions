import { getHAWSConnection } from "@lib/common";
import { State } from "@lib/haapi";

export interface Forecast {
  condition: string;
  temperature?: number;
  templow?: number;
  datetime: string;
  wind_bearing?: number;
  wind_speed?: number;
}

export function isDailyForecast(forecast: Forecast[] | undefined | null) {
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

export function getWindspeedFromState(state: State | undefined) {
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

export function getPressureFromState(state: State | undefined) {
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

export function getHumidityFromState(state: State | undefined) {
  if (!state) {
    return undefined;
  }
  if (state.attributes.device_class === "humidity") {
    const unit = state.attributes.unit_of_measurement as string | undefined;
    return unit && unit.length > 0 ? `${state.state} ${unit}` : `${state.state}`;
  }
  const humidity = state.attributes.humidity as number | undefined;
  if (humidity !== undefined) {
    return `${humidity}%`;
  }
}

export function getTemperatureFromState(state: State | undefined) {
  if (!state) {
    return undefined;
  }
  if (state.attributes.device_class === "temperature") {
    const unit = state.attributes.unit_of_measurement;
    return unit ? `${state.state} ${unit}` : `${state.state}`;
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

export function weatherConditionToIcon(condition: string) {
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

export function weatherConditionToText(condition: string) {
  return weatherStatusToText[condition] || "❓";
}

interface WeatherForecastResponse {
  forecast: Array<Forecast> | undefined;
}

interface WeatherForecastRoot {
  response: Record<string, WeatherForecastResponse>;
}

export enum WeatherForecastType {
  Daily = "daily",
  Hourly = "hourly",
}

export async function getWeatherForecast(entityID: string, options: { type: WeatherForecastType }) {
  const con = await getHAWSConnection();
  const rc: WeatherForecastRoot | undefined = await con?.sendMessagePromise({
    type: "execute_script",
    sequence: [
      {
        service: "weather.get_forecasts",
        data: {
          type: options.type,
        },
        target: {
          entity_id: entityID,
        },
        response_variable: "service_result",
      },
      {
        stop: "done",
        response_variable: "service_result",
      },
    ],
  });
  const forecast = rc?.response[entityID].forecast;
  return forecast;
}
