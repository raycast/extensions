import { type WindguruModel } from "wind-scrape/dist/interfaces/windguru";
import { Forecast } from "../types/forecast";
import { ForecastDay } from "../types/forecastDay";
import { ALL_WEATHER_MODELS } from "../data/weatherModels";
import { ALL_WAVE_MODELS } from "../data/waveModels";

const TODAY_INDEX = 0;
const TOMORROW_INDEX = 1;
const AFTER_TOMORROW_INDEX = 2;

function buildDay(dayIndex: number, weatherModel: WindguruModel, wavesModel: WindguruModel): ForecastDay {
  return {
    date: weatherModel.days[dayIndex]?.date ?? "-",
    weather: {
      modelName: (weatherModel?.name as keyof typeof ALL_WEATHER_MODELS) ?? "-",
      hours: weatherModel?.days[dayIndex]?.hours ?? [],
    },
    waves: {
      modelName: (wavesModel?.name as keyof typeof ALL_WAVE_MODELS) ?? "-",
      hours: wavesModel?.days[dayIndex]?.hours ?? [],
    },
  };
}

export function buildForecast(weatherModel: WindguruModel, wavesModel: WindguruModel): Forecast {
  const today = buildDay(TODAY_INDEX, weatherModel, wavesModel);
  const tomorrow = buildDay(TOMORROW_INDEX, weatherModel, wavesModel);
  const afterTomorrow = buildDay(AFTER_TOMORROW_INDEX, weatherModel, wavesModel);

  return {
    today,
    tomorrow,
    afterTomorrow,
  };
}
