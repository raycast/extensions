// import { getPreferenceValues } from "@raycast/api";
// import { Preferences } from "./types";

interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    localtime: string;
  };
  current: {
    temp_f: number;
    temp_c: number;
    condition: {
      text: string;
      icon: string;
    };
    wind_mph: number;
    wind_dir: string;
    humidity: number;
    feelslike_f: number;
    feelslike_c: number;
    uv: number;
    precip_in: number;
  };
  forecast?: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_f: number;
        mintemp_f: number;
        condition: {
          text: string;
          icon: string;
        };
        daily_chance_of_rain: number;
      };
    }>;
  };
}

// Map weather conditions to emoji
function getWeatherEmoji(condition: string): string {
  const conditionLower = condition.toLowerCase();

  if (conditionLower.includes("sunny") || conditionLower.includes("clear")) return "☀️";
  if (conditionLower.includes("partly cloudy")) return "⛅";
  if (conditionLower.includes("cloudy") || conditionLower.includes("overcast")) return "☁️";
  if (conditionLower.includes("rain") || conditionLower.includes("drizzle")) return "🌧️";
  if (conditionLower.includes("thunder") || conditionLower.includes("storm")) return "⛈️";
  if (conditionLower.includes("snow")) return "❄️";
  if (conditionLower.includes("fog") || conditionLower.includes("mist")) return "🌫️";
  if (conditionLower.includes("wind")) return "💨";

  return "🌤️"; // Default
}

// Fetch weather data using a free weather API
export async function getWeatherData(location: string, lat?: number, lon?: number): Promise<WeatherData | null> {
  try {
    // Using WeatherAPI.com which has a free tier
    const API_KEY = "YOUR_WEATHER_API_KEY"; // You'll need to sign up for a free key

    let query = location;
    if (lat && lon) {
      query = `${lat},${lon}`;
    }

    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(query)}&days=3&aqi=no`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error("Weather API error:", response.status);
      return null;
    }

    const data = (await response.json()) as WeatherData;
    return data;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null;
  }
}

// Format weather data into markdown
export function formatWeatherMarkdown(weather: WeatherData): string {
  const emoji = getWeatherEmoji(weather.current.condition.text);

  const markdown = `
# ${emoji} Weather for ${weather.location.name}, ${weather.location.region}

## Current Conditions
**${weather.current.condition.text}**

🌡️ **Temperature:** ${Math.round(weather.current.temp_f)}°F (${Math.round(weather.current.temp_c)}°C)
🤔 **Feels Like:** ${Math.round(weather.current.feelslike_f)}°F (${Math.round(weather.current.feelslike_c)}°C)
💨 **Wind:** ${weather.current.wind_mph} mph ${weather.current.wind_dir}
💧 **Humidity:** ${weather.current.humidity}%
☔ **Precipitation:** ${weather.current.precip_in}" 
☀️ **UV Index:** ${weather.current.uv}

${weather.forecast ? formatForecast(weather.forecast) : ""}

*Updated: ${new Date(weather.location.localtime).toLocaleString()}*
`;

  return markdown;
}

function formatForecast(forecast: WeatherData["forecast"]): string {
  if (!forecast || !forecast.forecastday) return "";

  let forecastMd = "\n## 3-Day Forecast\n\n";

  forecast.forecastday.forEach((day) => {
    const date = new Date(day.date);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const emoji = getWeatherEmoji(day.day.condition.text);

    forecastMd += `**${dayName}** ${emoji} ${day.day.condition.text} `;
    forecastMd += `High: ${Math.round(day.day.maxtemp_f)}°F Low: ${Math.round(day.day.mintemp_f)}°F`;
    if (day.day.daily_chance_of_rain > 0) {
      forecastMd += ` 🌧️ ${day.day.daily_chance_of_rain}%`;
    }
    forecastMd += "\n";
  });

  return forecastMd;
}

// Alternative: Use Google's weather data from search results
export function parseGoogleWeatherFromSources(sources: unknown[]): unknown {
  // Look for weather data in search results
  // Google often includes weather info in search snippets
  for (const source of sources) {
    const sourceObj = source as { snippet?: string };
    if (sourceObj.snippet && sourceObj.snippet.toLowerCase().includes("weather")) {
      // Extract temperature and conditions from snippet
      const tempMatch = sourceObj.snippet.match(/(\d+)°[FC]/);
      const conditionMatch = sourceObj.snippet.match(/(sunny|cloudy|rain|snow|clear|partly cloudy|overcast)/i);

      if (tempMatch || conditionMatch) {
        return {
          temperature: tempMatch ? tempMatch[1] : null,
          condition: conditionMatch ? conditionMatch[1] : null,
          source: source,
        };
      }
    }
  }

  return null;
}
