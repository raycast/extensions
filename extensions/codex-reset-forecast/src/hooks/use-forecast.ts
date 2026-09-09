import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { fetchForecast } from "../api/forecast-client";
import { raycastForecastStore } from "../api/forecast-store";
import { sourceWarning } from "../domain/format-forecast";

function loadForecast() {
  return fetchForecast({ store: raycastForecastStore });
}

export function useForecast() {
  const [saved] = useState(() => raycastForecastStore.read());
  const result = usePromise(loadForecast, [], { onError: () => undefined });
  const data = result.data ?? saved;
  const warning = data ? sourceWarning(data.response) : undefined;
  return { ...result, data, warning };
}
