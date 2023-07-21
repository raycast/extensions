import { useCallback, useEffect, useState } from "react";
import { getCurWeather } from "../utils/weather-utils";
import { Cache, environment, LaunchType } from "@raycast/api";
import { CacheKey, isEmpty, preferencesChanged, shouldRefresh } from "../utils/common-utils";
import { GeoLocation, OpenMeteoWeather } from "../types/types";

export const getCurrentWeather = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [weather, setWeather] = useState<OpenMeteoWeather>();
  const [location, setLocation] = useState<GeoLocation>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const cache = new Cache();
    const cacheWeather = cache.get(CacheKey.CURRENT_WEATHER);
    const cacheLocation = cache.get(CacheKey.LOCATION);
    const cacheTime = cache.get(CacheKey.REFRESH_TIME);
    let oldRefreshTime = 0;
    if (typeof cacheWeather === "string" && !isEmpty(cacheWeather)) {
      try {
        setWeather(JSON.parse(cacheWeather) as OpenMeteoWeather);
      } catch (e) {
        console.debug(`Could not parse cached weather: ${cacheWeather}`, e);
      }
    }
    if (typeof cacheLocation === "string" && !isEmpty(cacheLocation)) {
      try {
        setLocation(JSON.parse(cacheLocation) as GeoLocation);
      } catch (e) {
        console.debug(`Could not parse cached location: ${cacheLocation}`, e);
      }
    }
    if (typeof cacheTime === "string" && !isEmpty(cacheTime)) {
      try {
        oldRefreshTime = JSON.parse(cacheTime) as number;
      } catch (e) {
        console.debug(`Could not parse cached time: ${cacheTime}`, e);
      }
    }
    const newRefreshTime = Date.now();
    const isRefresh = shouldRefresh(oldRefreshTime, newRefreshTime) || preferencesChanged();

    if (isRefresh || environment.launchType === LaunchType.Background) {
      try {
        const { weather, geoLocation } = await getCurWeather();
        if (typeof weather !== "undefined") {
          setWeather(weather);
          cache.set(CacheKey.CURRENT_WEATHER, JSON.stringify(weather));
        } else {
          cache.set(CacheKey.CURRENT_WEATHER, JSON.stringify(""));
        }
        if (typeof geoLocation !== "undefined") {
          setLocation(geoLocation);
          cache.set(CacheKey.LOCATION, JSON.stringify(geoLocation));
        } else {
          cache.set(CacheKey.LOCATION, JSON.stringify(""));
        }
        cache.set(CacheKey.REFRESH_TIME, JSON.stringify(newRefreshTime));
      } catch (e) {
        setWeather(undefined);
        console.error(e);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { weather: weather, location: location, loading: loading };
};
