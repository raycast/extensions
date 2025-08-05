import { WindguruData } from "wind-scrape";
import { WindguruModel } from "wind-scrape/dist/interfaces/windguru";
import { ALL_WEATHER_MODELS, PREFERRED_WEATHER_MODELS } from "../data/weatherModels";
import { ALL_WAVE_MODELS } from "../data/waveModels";

export function chooseForecastModelsToUse(windguruData: WindguruData): {
  weatherModel: WindguruModel;
  wavesModel: WindguruModel;
} {
  const preferredWeatherModel = windguruData.models?.find((model) =>
    PREFERRED_WEATHER_MODELS.includes(model.name)
  ) as WindguruModel;
  const wavesModel = windguruData.models?.find((model) => ALL_WAVE_MODELS.includes(model.name)) as WindguruModel;

  if (preferredWeatherModel) {
    return {
      weatherModel: preferredWeatherModel,
      wavesModel,
    };
  }

  const alternateWeatherModel = windguruData?.models.find((model) =>
    ALL_WEATHER_MODELS.includes(model.name)
  ) as WindguruModel;

  return {
    weatherModel: alternateWeatherModel,
    wavesModel,
  };
}
