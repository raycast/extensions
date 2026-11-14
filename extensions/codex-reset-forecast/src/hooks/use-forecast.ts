import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { fetchForecast } from "../api/forecast-client";
import { raycastForecastStore } from "../api/forecast-store";
import { sourceWarning } from "../domain/format-forecast";

function loadForecast() {
  return fetchForecast({
    store: raycastForecastStore,
    onCacheFallback: (error) => {
      void showToast({
        style: Toast.Style.Failure,
        title: "Could not refresh forecast",
        message: error.message,
      });
    },
  });
}

export function useForecast() {
  const [saved] = useState(() => raycastForecastStore.read());
  const result = usePromise(loadForecast, []);
  const data = result.data ?? saved;
  const warning = data ? sourceWarning(data.response) : undefined;
  return { ...result, data, warning };
}
