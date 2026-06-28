import { List, Icon } from "@raycast/api";
import { TimeStep } from "./types";
import {
  formatTemperature,
  formatWindSpeed,
  formatPrecipitation,
  getWeatherIcon,
} from "./utils";

interface HourDetailProps {
  item: TimeStep;
  units: {
    temperature: string;
    felttemperature: string;
    precipitation: string;
    windspeed: string;
    sealevelpressure: string;
  };
}

export function HourDetail({ item, units }: HourDetailProps) {
  const date = new Date(item.time);
  const title = date.toLocaleString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <List navigationTitle={title}>
      <List.Section title={title}>
        <List.Item
          title="Conditions"
          subtitle={getConditionLabel(item.pictocode)}
          icon={getWeatherIcon(item.pictocode)}
        />
        <List.Item
          title="Temperature"
          subtitle={formatTemperature(item.temperature, units.temperature)}
          icon={Icon.Temperature}
        />
        <List.Item
          title="Feels Like"
          subtitle={formatTemperature(
            item.felttemperature,
            units.felttemperature,
          )}
          icon={Icon.Temperature}
        />
        <List.Item
          title="Precipitation"
          subtitle={formatPrecipitation(
            item.precipitation,
            units.precipitation,
          )}
          icon={Icon.CloudRain}
        />
        <List.Item
          title="Wind Speed"
          subtitle={formatWindSpeed(item.windspeed, units.windspeed)}
          icon={Icon.Gauge}
        />
        <List.Item
          title="Wind Direction"
          subtitle={
            item.winddirection !== undefined
              ? `${Math.round(item.winddirection)}°`
              : "N/A"
          }
          icon={Icon.ArrowRight}
        />
        <List.Item
          title="Relative Humidity"
          subtitle={
            item.relativehumidity
              ? `${Math.round(item.relativehumidity)}%`
              : "N/A"
          }
          icon={Icon.Humidity}
        />
        {item.sealevelpressure !== undefined && (
          <List.Item
            title="Pressure"
            subtitle={`${Math.round(item.sealevelpressure)} ${units.sealevelpressure}`}
            icon={Icon.Gauge}
          />
        )}
        {item.uvindex !== undefined && (
          <List.Item
            title="UV Index"
            subtitle={Math.round(item.uvindex).toString()}
            icon={Icon.Sun}
          />
        )}
        {item.predictability !== undefined && (
          <List.Item
            title="Predictability"
            subtitle={`${Math.round(item.predictability)}%`}
            icon={Icon.CheckCircle}
          />
        )}
      </List.Section>
    </List>
  );
}

function getConditionLabel(pictocode: number | undefined): string {
  if (pictocode === undefined) return "Unknown";
  if (pictocode === 1) return "Clear";
  if (pictocode === 2) return "Mostly Clear";
  if (pictocode === 3) return "Partly Cloudy";
  if (pictocode === 4) return "Overcast";
  if (pictocode === 5) return "Light Rain";
  if (pictocode === 6) return "Rain";
  if (pictocode === 7) return "Heavy Rain";
  if (pictocode === 8) return "Rain Showers";
  if (pictocode === 9) return "Snow";
  if (pictocode >= 10) return "Storm";
  return "Unknown";
}
