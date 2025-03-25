import { WindguruModelHour } from "wind-scrape/dist/interfaces/windguru";
import { ALL_WEATHER_MODELS } from "../data/weatherModels";
import { ALL_WAVE_MODELS } from "../data/waveModels";

interface ForecastDayDetail {
  hours: WindguruModelHour[];
}

export interface WeatherForecastDayDetail extends ForecastDayDetail {
  modelName: keyof typeof ALL_WEATHER_MODELS;
}

export interface WavesForecastDayDetail extends ForecastDayDetail {
  modelName: keyof typeof ALL_WAVE_MODELS;
}

export interface ForecastDay {
  date: string;
  weather: WeatherForecastDayDetail;
  waves: WavesForecastDayDetail;
}
