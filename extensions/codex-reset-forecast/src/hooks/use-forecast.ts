import { useCachedPromise } from "@raycast/utils";
import { fetchForecast } from "../api/forecast-client";
import { raycastForecastStore } from "../api/forecast-store";

function loadForecast() {
  return fetchForecast({ store: raycastForecastStore });
}

export function useForecast() {
  return useCachedPromise(loadForecast, [], { keepPreviousData: true });
}
