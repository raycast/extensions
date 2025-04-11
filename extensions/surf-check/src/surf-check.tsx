import { ActionPanel, Detail, List, Action, Icon, Color, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import {
  HeightUnit,
  WindSpeedUnit,
  TemperatureUnit,
  UnitPreferences,
  formatHeight,
  formatTemp,
  formatWindSpeed,
} from "./utils";

interface Preferences extends UnitPreferences {
  spotId: string;
}

interface Spot {
  _id: string;
  name: string;
  rating: { key: string; value: number; human: boolean };
  waveHeight: { min: number; max: number; humanRelation: string };
  wind: { speed: number; direction: number; directionType: string };
  waterTemp: { min: number; max: number };
  tide: {
    previous: { type: string; height: number; timestamp: number };
    current: { type: string; height: number; timestamp: number };
    next: { type: string; height: number; timestamp: number };
  };
}

interface DetailedSpot {
  spot: {
    name: string;
    lat: number;
    lon: number;
  };
  forecast: {
    conditions: { value: string; human: boolean };
    waveHeight: { min: number; max: number; humanRelation: string };
    wind: { speed: number; direction: number; directionType: string };
    waterTemp: { min: number; max: number };
    tide: {
      previous: { type: string; height: number; timestamp: number };
      current: { type: string; height: number; timestamp: number };
      next: { type: string; height: number; timestamp: number };
    };
    swells: Array<{ height: number; period: number; direction: number }>;
  };
  report?: {
    timestamp: number;
    forecaster: { name: string };
    body: string;
  };
}

function formatString(str: string): string {
  return str
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSurfHeight(min: number, max: number, unit: HeightUnit): string {
  return `${formatHeight(min, unit)}-${formatHeight(max, unit)}`;
}

function getRatingIcon(rating: string): { icon: Icon; tintColor: Color } {
  const formattedRating = formatString(rating);
  switch (formattedRating) {
    case "Very Poor":
      return { icon: Icon.StackedBars1, tintColor: Color.Red };
    case "Poor":
      return { icon: Icon.StackedBars1, tintColor: Color.Orange };
    case "Poor To Fair":
      return { icon: Icon.StackedBars2, tintColor: Color.Yellow };
    case "Fair":
      return { icon: Icon.StackedBars2, tintColor: Color.Green };
    case "Fair To Good":
      return { icon: Icon.StackedBars3, tintColor: Color.Green };
    case "Good":
      return { icon: Icon.StackedBars3, tintColor: Color.Blue };
    case "Epic":
      return { icon: Icon.StackedBars4, tintColor: Color.Purple };
    default:
      return { icon: Icon.Circle, tintColor: Color.PrimaryText };
  }
}

function getWindDescription(speed: number): string {
  if (speed < 5) return "Light";
  if (speed < 10) return "Moderate";
  return "Strong";
}

function formatUrlName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function Command() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { spotId, surfHeightUnit, windSpeedUnit, temperatureUnit } = getPreferenceValues<Preferences>();

  useEffect(() => {
    fetchSurfData();
  }, []);

  async function fetchSurfData() {
    try {
      const response = await fetch(`https://services.surfline.com/kbyg/spots/nearby?spotId=${spotId}`);
      const data = (await response.json()) as { data: { spots: Spot[] } };
      setSpots(data.data.spots);
    } catch (error) {
      console.error("Error fetching surf data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading}>
      {spots.map((spot) => {
        const { icon, tintColor } = getRatingIcon(spot.rating.key);
        const surflineUrl = `https://www.surfline.com/surf-report/${formatUrlName(spot.name)}/${spot._id}`;
        return (
          <List.Item
            key={spot._id}
            icon={{ source: icon, tintColor }}
            title={spot.name}
            subtitle={`${formatString(spot.rating.key)} (${formatSurfHeight(spot.waveHeight.min, spot.waveHeight.max, surfHeightUnit)})`}
            accessories={[
              { text: formatString(spot.waveHeight.humanRelation) },
              {
                icon: Icon.Wind,
                text: `${getWindDescription(spot.wind.speed)} ${formatWindSpeed(spot.wind.speed, windSpeedUnit)}`,
              },
              { icon: Icon.Temperature, text: formatTemp(spot.waterTemp.max, temperatureUnit) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Details"
                  target={<SpotDetails spot={spot} preferences={{ surfHeightUnit, windSpeedUnit, temperatureUnit }} />}
                />
                <Action.OpenInBrowser title="Open Surfline Report" url={surflineUrl} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

interface SpotDetailsProps {
  spot: Spot;
  preferences: {
    surfHeightUnit: HeightUnit;
    windSpeedUnit: WindSpeedUnit;
    temperatureUnit: TemperatureUnit;
  };
}

function SpotDetails({ spot, preferences }: SpotDetailsProps) {
  const { surfHeightUnit, windSpeedUnit, temperatureUnit } = preferences;
  const { pop } = useNavigation();
  const [detailedSpot, setDetailedSpot] = useState<DetailedSpot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDetailedSpotData();
  }, []);

  async function fetchDetailedSpotData() {
    try {
      const response = await fetch(`https://services.surfline.com/kbyg/spots/reports?spotId=${spot._id}`);
      const data = (await response.json()) as DetailedSpot;
      setDetailedSpot(data);
    } catch (error) {
      console.error("Error fetching detailed spot data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!detailedSpot) {
    return <Detail markdown="Failed to load detailed spot data." />;
  }

  const { icon, tintColor } = getRatingIcon(detailedSpot.forecast.conditions.value);
  const surflineUrl = `https://www.surfline.com/surf-report/${formatUrlName(detailedSpot.spot.name)}/${spot._id}`;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const cleanHtml = (html: string) => {
    return html
      .replace(/<p>/g, "")
      .replace(/<\/p>/g, "\n\n")
      .replace(/<br>/g, "\n")
      .replace(/<strong>/g, "**")
      .replace(/<\/strong>/g, "**")
      .trim();
  };

  const detailsMarkdown = `
# ${detailedSpot.spot.name}

<img src="${icon}" width="32" height="32" style="vertical-align: middle; margin-right: 8px;" /> ${formatString(detailedSpot.forecast.conditions.value)} (${formatSurfHeight(detailedSpot.forecast.waveHeight.min, detailedSpot.forecast.waveHeight.max, surfHeightUnit)})

## Surf Conditions
- Wave Height: ${detailedSpot.forecast.waveHeight.humanRelation}
- Wind: ${getWindDescription(detailedSpot.forecast.wind.speed)} ${formatWindSpeed(detailedSpot.forecast.wind.speed, windSpeedUnit)} ${detailedSpot.forecast.wind.directionType} (${detailedSpot.forecast.wind.direction}°)
- Water Temperature: ${formatTemp(detailedSpot.forecast.waterTemp.min, temperatureUnit)} - ${formatTemp(detailedSpot.forecast.waterTemp.max, temperatureUnit)}

## Tide Details
| Type | Height | Time |
|------|--------|------|
| Previous | ${detailedSpot.forecast.tide.previous.type} ${formatHeight(detailedSpot.forecast.tide.previous.height, surfHeightUnit)} | ${formatTime(detailedSpot.forecast.tide.previous.timestamp)} |
| Current | ${detailedSpot.forecast.tide.current.type} ${formatHeight(detailedSpot.forecast.tide.current.height, surfHeightUnit)} | ${formatTime(detailedSpot.forecast.tide.current.timestamp)} |
| Next | ${detailedSpot.forecast.tide.next.type} ${formatHeight(detailedSpot.forecast.tide.next.height, surfHeightUnit)} | ${formatTime(detailedSpot.forecast.tide.next.timestamp)} |

## Swells
${detailedSpot.forecast.swells
  .map(
    (swell, index) =>
      `${index + 1}. Height: ${formatHeight(swell.height, surfHeightUnit)}, Period: ${swell.period}s, Direction: ${swell.direction}°`,
  )
  .join("\n")}

${
  detailedSpot.report
    ? `
## Forecaster Report
_${detailedSpot.report.forecaster.name} at ${formatTime(detailedSpot.report.timestamp)}_

${cleanHtml(detailedSpot.report.body)}
`
    : ""
}

---

_Data provided by Surfline_
  `;

  return (
    <Detail
      markdown={detailsMarkdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Rating"
            text={formatString(detailedSpot.forecast.conditions.value)}
            icon={{ source: icon, tintColor: tintColor }}
          />
          <Detail.Metadata.Label
            title="Wave Height"
            text={formatSurfHeight(
              detailedSpot.forecast.waveHeight.min,
              detailedSpot.forecast.waveHeight.max,
              surfHeightUnit,
            )}
          />
          <Detail.Metadata.Label
            title="Wind"
            text={`${getWindDescription(detailedSpot.forecast.wind.speed)} ${formatWindSpeed(detailedSpot.forecast.wind.speed, windSpeedUnit)}`}
            icon={Icon.Wind}
          />
          <Detail.Metadata.Label
            title="Water Temperature"
            text={`${formatTemp(detailedSpot.forecast.waterTemp.min, temperatureUnit)} - ${formatTemp(detailedSpot.forecast.waterTemp.max, temperatureUnit)}`}
            icon={Icon.Temperature}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Go Back" onAction={pop} />
          <Action.OpenInBrowser title="Open Surfline Report" url={surflineUrl} />
        </ActionPanel>
      }
    />
  );
}
