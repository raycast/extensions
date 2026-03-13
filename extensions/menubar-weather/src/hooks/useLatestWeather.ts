import { KLocation, OpenMeteoWeather } from "../types/types";
import { useCachedPromise } from "@raycast/utils";
import { getOpenMeteoWeather } from "../utils/axios-utils";
import { Cache } from "@raycast/api";
import { CacheKey } from "../utils/common-utils";

async function getLatestWeather(kLocation: KLocation | undefined) {
  // getLocation
  if (!kLocation) {
    return undefined;
  }
  // getWeather
  const openMetroWeather = await getOpenMeteoWeather(kLocation.latitude.toString(), kLocation.longitude.toString());
  const cache = new Cache();
  cache.set(CacheKey.LATEST_WEATHER, JSON.stringify(openMetroWeather));
  return openMetroWeather;
}

export function useLatestWeather(kLocation: KLocation | undefined) {
  return useCachedPromise(
    (kLocation: KLocation | undefined) => {
      return getLatestWeather(kLocation) as Promise<OpenMeteoWeather>;
    },
    [kLocation],
    { keepPreviousData: true },
  );
}
