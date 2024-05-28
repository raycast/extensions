import { Cache, LaunchType, environment, updateCommandMetadata } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { GeoLocation, OpenMeteoWeather } from "../types/types";
import { CacheKey, getMenuItem, isEmpty, preferencesChanged, shouldRefresh } from "../utils/common-utils";
import { getCurWeather } from "../utils/weather-utils";

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
        const oldWeather = JSON.parse(cacheWeather) as OpenMeteoWeather;
        setWeather(oldWeather);
        const menuItems: string[] = getMenuItem(oldWeather);
        updateCommandMetadata({ subtitle: menuItems.join(" | ") });
      } catch (e) {
        console.error(`Could not parse cached weather: ${cacheWeather}`, e);
      }
    }
    if (typeof cacheLocation === "string" && !isEmpty(cacheLocation)) {
      try {
        setLocation(JSON.parse(cacheLocation) as GeoLocation);
      } catch (e) {
        console.error(`Could not parse cached location: ${cacheLocation}`, e);
      }
    }
    if (typeof cacheTime === "string" && !isEmpty(cacheTime)) {
      try {
        oldRefreshTime = JSON.parse(cacheTime) as number;
      } catch (e) {
        console.error(`Could not parse cached time: ${cacheTime}`, e);
      }
    }
    const newRefreshTime = Date.now();
    const isPreferencesChanged = preferencesChanged();
    const isRefresh = shouldRefresh(oldRefreshTime, newRefreshTime) || isPreferencesChanged;

    if (isRefresh || environment.launchType === LaunchType.Background) {
      try {
        const { weather, geoLocation } = await getCurWeather();
        if (typeof weather !== "undefined") {
          setWeather(weather);
          cache.set(CacheKey.CURRENT_WEATHER, JSON.stringify(weather));
          const menuItems: string[] = getMenuItem(weather);
          updateCommandMetadata({ subtitle: menuItems.join(" | ") });
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
