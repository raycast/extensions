import { ForecastDay } from "./forecastDay";

export const FORECAST_KEY_TRANSLATIONS = {
  today: "Today",
  tomorrow: "Tomorrow",
  afterTomorrow: "Day after tomorrow",
};

export interface Forecast {
  today: ForecastDay;
  tomorrow: ForecastDay;
  afterTomorrow: ForecastDay;
}
