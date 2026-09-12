import { environment } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { getErrorMessage } from "../utils";
import { Weather, wttr } from "../wttr";
import { getDefaultQuery } from "./weather";

export function useWeather(query: string | undefined): {
  data: Weather | undefined;
  error?: string;
  isLoading: boolean;
  fetchDate: Date | undefined;
} {
  const [fetchDate, setFetchDate] = useCachedState<Date | undefined>("last-fetch", undefined, {
    cacheNamespace: environment.commandName,
  });
  const { data, error, isLoading } = useCachedPromise(
    async (q) => {
      let query = q;
      if (!query) {
        const dq = getDefaultQuery();
        if (dq && dq.length > 0) {
          query = dq;
        }
      }
      const wdata = await wttr.getWeather(query);
      setFetchDate(new Date());
      return wdata;
    },
    [query],
    { keepPreviousData: true },
  );

  return { data, error: error ? getErrorMessage(error) : undefined, isLoading, fetchDate };
}
