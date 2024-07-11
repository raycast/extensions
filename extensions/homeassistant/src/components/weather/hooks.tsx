import { useCachedPromise } from "@raycast/utils";
import { Forecast, getWeatherForecast } from "./utils";

interface WeatherForecastOptions {
  /** Use the given data instead of fetching new data */
  data?: Forecast[] | null;
}

export function useWeatherForecast(entityID: string | undefined, options?: WeatherForecastOptions) {
  const { data, isLoading, error } = useCachedPromise(
    async (entityID: string | undefined) => {
      if (options?.data !== undefined) {
        return options.data;
      }
      if (!entityID) {
        return undefined;
      }
      return await getWeatherForecast(entityID);
    },
    [entityID],
    {
      onError: () => {},
    },
  );
  return { data, isLoading, error };
}
