import { getErrorMessage } from "../utils";
import { Weather, wttr } from "../wttr";
import { getDefaultQuery } from "./weather";
import { useCachedPromise } from "@raycast/utils";

export function useWeather(query: string | undefined): {
  data: Weather | undefined;
  error?: string;
  isLoading: boolean;
} {
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
      return wdata;
    },
    [query],
    { keepPreviousData: true },
  );

  return { data, error: error ? getErrorMessage(error) : undefined, isLoading };
}
