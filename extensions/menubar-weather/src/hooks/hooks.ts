import { GeoLocation, Weather } from "../types/types";
import { useCallback, useEffect, useState } from "react";
import { getCurWeather } from "../utils/open-weather-utils";
import { Cache, environment, LaunchType, showToast, Toast } from "@raycast/api";
import { CacheKey, isEmpty } from "../utils/common-utils";
import { AxiosError } from "axios";

export const getCurrentWeather = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [weather, setWeather] = useState<Weather>();
  const [refreshTime, setRefreshTime] = useState<string>();
  const [location, setLocation] = useState<GeoLocation>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const cache = new Cache();
    const cacheWeather = cache.get(CacheKey.CURRENT_WEATHER);
    const cacheLocation = cache.get(CacheKey.LOCATION);
    const cacheTime = cache.get(CacheKey.REFRSH_TIME);
    if (typeof cacheWeather === "string" && !isEmpty(cacheWeather)) {
      setWeather(JSON.parse(cacheWeather) as Weather);
    }
    if (typeof cacheLocation === "string" && !isEmpty(cacheLocation)) {
      setLocation(JSON.parse(cacheLocation) as GeoLocation);
    }
    if (typeof cacheTime === "string" && !isEmpty(cacheTime)) {
      setRefreshTime(JSON.parse(cacheTime) as string);
    }

    if (typeof cacheWeather === "undefined" || environment.launchType === LaunchType.Background) {
      const date = new Date();
      const refreshTime = date.toLocaleTimeString();
      setRefreshTime(refreshTime);
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
        cache.set(CacheKey.REFRSH_TIME, JSON.stringify(refreshTime));
      } catch (e) {
        console.error(e);
        const error = e as AxiosError;
        await showToast({ title: `${error.name}`, message: `${error.message}`, style: Toast.Style.Failure });
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { weather: weather, location: location, refreshTime: refreshTime, loading: loading };
};
