import { useEffect } from "react";
import fetch from "node-fetch";
import { useCachedState } from "@raycast/utils";

export default function getWeather(type: "temperature" | "wind" | "default" = "default") {
  const [weatherData, setWeatherData] = useCachedState<string | null>(`weather-data-${type}`, null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let format;
        switch (type) {
          case "temperature":
            format = "%t";
            break;
          case "wind":
            format = "%w";
            break;
          default:
            format = "%t+%w";
        }
        const response = await fetch(`https://wttr.in/?format=${format}`);
        const data = await response.text();
        setWeatherData(data);
      } catch (error) {
        console.error("Error fetching weather data:", error);
      }
    };

    if (!weatherData) {
      fetchData();
    }
  }, [weatherData, type]);

  return weatherData;
}
