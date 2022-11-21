import { GeoLocation, Weather } from "../types/types";
import { useCallback, useEffect, useState } from "react";
import { getCurWeather } from "../utils/open-weather-utils";
import { Cache } from "@raycast/api";
import { CacheKey } from "../utils/common-utils";

export const getCurrentWeather = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [weather, setWeather] = useState<Weather>();
  const [location, setLocation] = useState<GeoLocation>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const cache = new Cache();
    const cacheWeather = cache.get(CacheKey.CURRENT_WEATHER);
    const cacheLocation = cache.get(CacheKey.LOCATION);
    if (typeof cacheWeather === "string") {
      setWeather(JSON.parse(cacheWeather) as Weather);
    }
    if (typeof cacheLocation === "string") {
      setLocation(JSON.parse(cacheLocation) as GeoLocation);
    }
    const { weather, geoLocation } = await getCurWeather();
    setWeather(weather);
    setLocation(geoLocation);
    cache.set(CacheKey.CURRENT_WEATHER, JSON.stringify(weather));
    cache.set(CacheKey.LOCATION, JSON.stringify(geoLocation));
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { weather: weather, location: location, loading: loading };
};
