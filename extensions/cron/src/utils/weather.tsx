import { useEffect } from "react";
import fetch from "node-fetch";
import { useCachedState } from "@raycast/utils";

export default function getWeather() {
  const [weatherData, setWeatherData] = useCachedState<string | null>("weather-data", null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("https://wttr.in/?format=%f+%w");
        const data = await response.text();
        setWeatherData(data);
      } catch (error) {
        console.error("Error fetching weather data:", error);
      }
    };

    if (!weatherData) {
      fetchData();
    }
  }, [weatherData]);

  return weatherData;
}
