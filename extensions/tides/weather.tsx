import { Detail } from "@raycast/api"; 
import { useEffect, useState } from "react";

type WeatherData = {
  temperature: string;
  wind: string;
  description: string;
};

export default function Command() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://goweather.xyz/weather/berlin")
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        const weatherData = data as { temperature: string; wind: string; description: string };
        setWeather({
          temperature: weatherData.temperature,
          wind: weatherData.wind,
          description: weatherData.description,
        });
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <Detail markdown={`# Error\n${error}`} />;
  }

  if (!weather) {
    return <Detail markdown="Loading weather..." />;
  }

  return (
    <Detail
      markdown={`# Berlin Weather\n\n**${weather.description}**\n\n- Temperature: ${weather.temperature}\n- Wind: ${weather.wind}`}
    />
  );
}
