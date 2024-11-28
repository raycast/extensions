import { useCachedPromise } from "@raycast/utils";
import { Forecast, getWeatherForecast, WeatherForecastType } from "./utils";

interface WeatherForecastOptions {
  type: WeatherForecastType;
  /** Use the given data instead of fetching new data */
  data?: Forecast[] | null;
}

export function useWeatherForecast(entityID: string | undefined, options?: WeatherForecastOptions) {
  const { data, isLoading, error } = useCachedPromise(
    async (entityID: string | undefined, type: WeatherForecastType | undefined) => {
      if (options?.data !== undefined) {
        return options.data;
      }
      if (!entityID) {
        return undefined;
      }
      return await getWeatherForecast(entityID, { type: type ?? WeatherForecastType.Daily });
    },
    [entityID, options?.type],
    {
      onError: () => {},
    },
  );
  return { data, isLoading, error };
}
