import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  getPreferenceValues,
  LocalStorage,
  LaunchProps,
  openCommandPreferences,
  popToRoot,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { join } from "node:path";
import fetch from "node-fetch";

interface Preferences {
  defaultLocation?: string;
  unit?: "celsius" | "fahrenheit";
}

const PROXY_URL = "https://weather-proxy.pvc-ed2.workers.dev";

interface CommandArguments {
  location?: string;
}

interface WeatherData {
  currentWeather?: {
    metadata?: {
      expireTime?: string;
    };
    temperature: number;
    conditionCode: string;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
    visibility: number;
    pressure: number;
    temperatureApparent: number;
  };
  forecastHourly?: {
    metadata?: {
      expireTime?: string;
    };
    hours?: Array<{
      forecastStart?: string;
      temperature?: number;
      conditionCode?: string;
      precipitationChance?: number;
    }>;
  };
  forecastDaily?: {
    metadata?: {
      expireTime?: string;
    };
    days?: Array<{
      forecastStart?: string;
      conditionCode?: string;
      temperatureMax?: number;
      temperatureMin?: number;
      precipitationChance?: number;
      sunrise?: string;
      sunset?: string;
    }>;
  };
  forecastNextHour?: {
    metadata?: {
      expireTime?: string;
    };
    forecastStart?: string;
    forecastEnd?: string;
    summary?: Array<{
      startTime?: string;
      endTime?: string;
      condition?: string;
      precipitationChance?: number;
      precipitationIntensity?: number;
    }>;
    minutes?: Array<{
      startTime?: string;
      precipitationChance?: number;
      precipitationIntensity?: number;
    }>;
  };
  weatherAlerts?: {
    metadata?: {
      expireTime?: string;
    };
    alerts?: Array<{
      detailsUrl?: string;
      source?: string;
      areaName?: string;
      summary?: string;
      severity?: string;
      issuedDate?: string;
      expirationDate?: string;
    }>;
  };
}

interface ReverseGeocodeResponse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
  display_name?: string;
}

interface ForwardGeocodeResponseItem {
  lat: string;
  lon: string;
  display_name?: string;
  address?: ReverseGeocodeResponse["address"];
}

interface ViewState {
  weather: WeatherData | null;
  placeName: string;
  coordinates: string;
  countryCode: string | null;
}

const SAVED_DEFAULT_LOCATION_KEY = "saved-default-location";
const WEATHER_CACHE_KEY = "weather-cache";

interface CachedWeatherEntry {
  expiresAt: string;
  weather: WeatherData;
}

type WeatherCache = Record<string, CachedWeatherEntry>;

function convertTemperature(temp: number, unit: "celsius" | "fahrenheit") {
  if (unit === "fahrenheit") {
    return (temp * 9) / 5 + 32;
  }
  return temp;
}

function getAssetPath(...segments: string[]) {
  return join(__dirname, "assets", ...segments);
}

const systemHourFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const systemWeekdayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
});

function toFileMarkdownSrc(filePath: string) {
  return `file:///${filePath.replace(/\\/g, "/")}`;
}

function toFileImageSource(filePath: string) {
  return filePath.startsWith("file:///")
    ? filePath
    : toFileMarkdownSrc(filePath);
}

function formatCondition(condition: string) {
  return condition.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function getSystemTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function formatOffsetIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const offsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(
    2,
    "0",
  );
  const offsetRemainder = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetRemainder}`;
}

function getDailyEndTimestamp() {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return formatOffsetIso(date);
}

function formatCoordinates(lat: string, lon: string) {
  return `${Number(lat).toFixed(3)}, ${Number(lon).toFixed(3)}`;
}

function normalizeLocationText(value?: string) {
  if (!value) {
    return "";
  }

  return value.trim().replace(/^weather\s+in\s+/i, "");
}

function parseCoordinateInput(value: string) {
  const match = value.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
  );

  if (!match) {
    return null;
  }

  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (
    Number.isNaN(lat) ||
    Number.isNaN(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return null;
  }

  return {
    lat: String(lat),
    lon: String(lon),
  };
}

function formatPlaceName(data: ReverseGeocodeResponse, fallback: string) {
  const city =
    data.address?.city ??
    data.address?.town ??
    data.address?.village ??
    data.address?.county;
  const province =
    (
      data.address as ReverseGeocodeResponse["address"] & {
        province?: string;
      }
    )?.province ?? undefined;
  const state = data.address?.state;
  const country = data.address?.country;

  const parts = [city, province, state, country].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(", ");
  }

  if (data.display_name) {
    return data.display_name.split(",").slice(0, 3).join(", ").trim();
  }

  return fallback;
}

async function reverseGeocode(lat: string, lon: string) {
  const fallback = formatCoordinates(lat, lon);
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      {
        headers: {
          "User-Agent": "raycast-weather-extension/1.0",
        },
      },
    );

    if (!response.ok) {
      return fallback;
    }

    const data = (await response.json()) as ReverseGeocodeResponse;
    return {
      placeName: formatPlaceName(data, fallback),
      countryCode: data.address?.country_code?.toUpperCase() ?? null,
    };
  } catch {
    return {
      placeName: fallback,
      countryCode: null,
    };
  }
}

async function geocodeWithOpenStreetMap(input: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(input)}`,
    {
      headers: {
        "User-Agent": "raycast-weather-extension/1.0",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Fallback geocoding failed: ${response.status} ${response.statusText}`,
    );
  }

  const results = (await response.json()) as ForwardGeocodeResponseItem[];
  const result = results[0];
  if (!result) {
    throw new Error(`No location found for "${input}".`);
  }

  return {
    lat: result.lat,
    lon: result.lon,
    placeName: formatPlaceName(
      {
        address: result.address,
        display_name: result.display_name,
      },
      formatCoordinates(result.lat, result.lon),
    ),
    countryCode: result.address?.country_code?.toUpperCase() ?? null,
  };
}

async function geocodeLocation(input: string): Promise<{
  lat: string;
  lon: string;
  placeName: string;
  countryCode: string | null;
}> {
  const coordinateInput = parseCoordinateInput(input);
  if (coordinateInput) {
    const reverseResult = await reverseGeocode(
      coordinateInput.lat,
      coordinateInput.lon,
    );
    return { ...coordinateInput, ...reverseResult };
  }

  return geocodeWithOpenStreetMap(input);
}

async function requestWeatherViaProxy(
  lat: string,
  lon: string,
  countryCode: string | null,
) {
  const searchParams = new URLSearchParams({
    lat,
    lon,
    timezone: getSystemTimezone(),
    dailyEnd: getDailyEndTimestamp(),
  });

  if (countryCode) {
    searchParams.set("countryCode", countryCode);
  }

  const url = `${PROXY_URL}?${searchParams.toString()}`;

  const weatherResponse = await fetch(url);

  if (weatherResponse.ok) {
    return (await weatherResponse.json()) as WeatherData;
  }

  const errorText = await weatherResponse.text();
  throw new Error(
    `Proxy error: ${weatherResponse.status} ${weatherResponse.statusText} - ${errorText}`,
  );
}

function getWeatherCacheKey(
  lat: string,
  lon: string,
  countryCode: string | null,
) {
  return [lat, lon, countryCode ?? ""].join("|");
}

function getWeatherExpiryTime(weather: WeatherData) {
  const expireTimes = [
    weather.currentWeather?.metadata?.expireTime,
    weather.forecastDaily?.metadata?.expireTime,
    weather.forecastHourly?.metadata?.expireTime,
    weather.forecastNextHour?.metadata?.expireTime,
    weather.weatherAlerts?.metadata?.expireTime,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  if (expireTimes.length === 0) {
    return null;
  }

  return new Date(Math.min(...expireTimes)).toISOString();
}

async function loadWeatherCache() {
  const storedCache =
    (await LocalStorage.getItem<string>(WEATHER_CACHE_KEY)) || "{}";

  try {
    return JSON.parse(storedCache) as WeatherCache;
  } catch {
    return {};
  }
}

async function saveWeatherCache(cache: WeatherCache) {
  await LocalStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
}

async function getCachedWeather(
  lat: string,
  lon: string,
  countryCode: string | null,
) {
  const cache = await loadWeatherCache();
  const cacheKey = getWeatherCacheKey(lat, lon, countryCode);
  const entry = cache[cacheKey];

  if (!entry) {
    return null;
  }

  const expiresAt = new Date(entry.expiresAt).getTime();
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    delete cache[cacheKey];
    await saveWeatherCache(cache);
    return null;
  }

  return entry.weather;
}

async function cacheWeather(
  lat: string,
  lon: string,
  countryCode: string | null,
  weather: WeatherData,
) {
  const expiresAt = getWeatherExpiryTime(weather);
  if (!expiresAt) {
    return;
  }

  const cache = await loadWeatherCache();
  cache[getWeatherCacheKey(lat, lon, countryCode)] = {
    expiresAt,
    weather,
  };
  await saveWeatherCache(cache);
}

function getConditionAsset(condition: string) {
  switch (condition) {
    case "Clear":
    case "MostlyClear":
    case "Hot":
      return getAssetPath("meteocons", "hero", "clear-day.svg");
    case "PartlyCloudy":
      return getAssetPath("meteocons", "hero", "partly-cloudy-day.svg");
    case "MostlyCloudy":
      return getAssetPath("meteocons", "hero", "overcast-day.svg");
    case "Cloudy":
      return getAssetPath("meteocons", "hero", "cloudy.svg");
    case "Breezy":
    case "Windy":
      return getAssetPath("meteocons", "hero", "wind.svg");
    case "Rain":
    case "HeavyRain":
    case "Showers":
      return getAssetPath("meteocons", "hero", "rain.svg");
    case "SunShowers":
      return getAssetPath("meteocons", "hero", "partly-cloudy-day-rain.svg");
    case "FreezingRain":
    case "WintryMix":
      return getAssetPath("meteocons", "hero", "partly-cloudy-day-sleet.svg");
    case "Drizzle":
      return getAssetPath("meteocons", "hero", "drizzle.svg");
    case "FreezingDrizzle":
      return getAssetPath("meteocons", "hero", "partly-cloudy-day-sleet.svg");
    case "Snow":
    case "HeavySnow":
    case "Sleet":
    case "Flurries":
    case "Frigid":
      return getAssetPath("meteocons", "hero", "snow.svg");
    case "SunFlurries":
      return getAssetPath("meteocons", "hero", "partly-cloudy-day-snow.svg");
    case "BlowingSnow":
    case "Blizzard":
      return getAssetPath("meteocons", "hero", "wind.svg");
    case "Hail":
      return getAssetPath("meteocons", "hero", "hail.svg");
    case "Thunderstorm":
    case "Thunderstorms":
    case "IsolatedThunderstorms":
    case "ScatteredThunderstorms":
    case "StrongThunderstorms":
    case "StrongStorms":
      return getAssetPath("meteocons", "hero", "thunderstorms-rain.svg");
    case "Hurricane":
    case "TropicalStorm":
      return getAssetPath("meteocons", "hero", "hurricane.svg");
    case "Fog":
    case "Foggy":
      return getAssetPath("meteocons", "hero", "fog.svg");
    case "Mist":
      return getAssetPath("meteocons", "hero", "mist.svg");
    case "Haze":
      return getAssetPath("meteocons", "hero", "mist.svg");
    case "BlowingDust":
      return getAssetPath("meteocons", "hero", "dust-wind.svg");
    case "Dust":
      return getAssetPath("meteocons", "hero", "dust.svg");
    case "Smoke":
    case "Smoky":
      return getAssetPath("meteocons", "hero", "smoke.svg");
    default:
      return getAssetPath("meteocons", "hero", "cloudy.svg");
  }
}

function getForecastConditionAsset(condition: string) {
  switch (condition) {
    case "Clear":
      return getAssetPath("tabler-forecast", "sun.svg");
    case "MostlyClear":
      return getAssetPath("tabler-forecast", "sun.svg");
    case "PartlyCloudy":
      return getAssetPath("tabler-forecast", "cloud.svg");
    case "MostlyCloudy":
      return getAssetPath("tabler-forecast", "cloud.svg");
    case "Cloudy":
      return getAssetPath("tabler-forecast", "cloud.svg");
    case "Rain":
    case "HeavyRain":
    case "Showers":
      return getAssetPath("tabler-forecast", "cloud-rain.svg");
    case "Drizzle":
      return getAssetPath("tabler-forecast", "cloud-rain.svg");
    case "Snow":
    case "HeavySnow":
    case "Flurries":
      return getAssetPath("tabler-forecast", "cloud-snow.svg");
    case "Sleet":
      return getAssetPath("tabler-forecast", "cloud-rain.svg");
    case "Thunderstorm":
    case "ScatteredThunderstorms":
    case "StrongThunderstorms":
      return getAssetPath("tabler-forecast", "cloud-storm.svg");
    case "Fog":
    case "Haze":
    case "BlowingDust":
    case "Smoke":
      return getAssetPath("tabler-forecast", "cloud-fog.svg");
    default:
      return getAssetPath("tabler-forecast", "cloud.svg");
  }
}

function formatHourLabel(value?: string) {
  if (!value) {
    return "--";
  }

  return systemHourFormatter.format(new Date(value));
}

function formatDayLabel(value?: string) {
  if (!value) {
    return "--";
  }

  return systemWeekdayFormatter.format(new Date(value));
}

function formatTimeLabel(value?: string) {
  if (!value) {
    return "--";
  }

  return systemHourFormatter.format(new Date(value));
}

function formatPrecipitationChance(value?: number) {
  if (value === undefined) {
    return "--";
  }

  return `${Math.round(value * 100)}%`;
}

function formatPrecipitationIntensity(value?: number) {
  if (value === undefined) {
    return "--";
  }

  return `${value.toFixed(1)} mm/h`;
}

function renderForecastConditionCell(condition?: string) {
  const label = formatCondition(condition ?? "Unknown");
  const icon = toFileMarkdownSrc(getForecastConditionAsset(condition ?? ""));

  return `<span><img src="${icon}" width="16" height="16" />&nbsp;${label}</span>`;
}

function renderHourlyForecast(
  hours: NonNullable<WeatherData["forecastHourly"]>["hours"],
  unit: "celsius" | "fahrenheit",
) {
  if (!hours || hours.length === 0) {
    return "_Hourly forecast unavailable._";
  }

  const now = new Date();
  const upcomingHours = hours.filter((hour) => {
    if (!hour.forecastStart) {
      return false;
    }

    return new Date(hour.forecastStart) >= now;
  });

  const rows = (upcomingHours.length > 0 ? upcomingHours : hours)
    .slice(0, 10)
    .map((hour) => {
      const temp = hour.temperature ?? 0;
      const tempDisplay = `${Math.round(convertTemperature(temp, unit))}°`;
      const precipitation =
        hour.precipitationChance !== undefined
          ? `${Math.round(hour.precipitationChance * 100)}%`
          : "--";
      return `| ${formatHourLabel(hour.forecastStart)} | ${renderForecastConditionCell(hour.conditionCode)} | ${tempDisplay} | ${precipitation} |`;
    });

  return [
    "| Hour | Condition | Temp | Rain |",
    "| --- | --- | ---: | ---: |",
    ...rows,
  ].join("\n");
}

function renderDailyForecast(
  days: NonNullable<WeatherData["forecastDaily"]>["days"],
  unit: "celsius" | "fahrenheit",
) {
  if (!days || days.length === 0) {
    return "_Daily forecast unavailable._";
  }

  const rows = days.slice(0, 7).map((day) => {
    const high =
      day.temperatureMax !== undefined
        ? `${Math.round(convertTemperature(day.temperatureMax, unit))}°`
        : "--";
    const low =
      day.temperatureMin !== undefined
        ? `${Math.round(convertTemperature(day.temperatureMin, unit))}°`
        : "--";
    const rain =
      day.precipitationChance !== undefined
        ? `${Math.round(day.precipitationChance * 100)}%`
        : "--";
    return `| ${formatDayLabel(day.forecastStart)} | ${renderForecastConditionCell(day.conditionCode)} | ${high} | ${low} | ${rain} |`;
  });

  return [
    "| Day | Condition | High | Low | Rain |",
    "| --- | --- | ---: | ---: | ---: |",
    ...rows,
  ].join("\n");
}

function renderNextHourSummary(
  forecastNextHour?: WeatherData["forecastNextHour"],
) {
  const minutes = forecastNextHour?.minutes ?? [];
  if (minutes.length > 0) {
    const firstMinute = minutes[0];
    const lastMinute = minutes[minutes.length - 1];
    const nextFifteenMinutes = minutes.slice(0, 15);
    const peakMinute = minutes.reduce((highest, minute) => {
      if (
        (minute.precipitationIntensity ?? 0) >
        (highest.precipitationIntensity ?? 0)
      ) {
        return minute;
      }

      return highest;
    }, minutes[0]);
    const averageChance =
      nextFifteenMinutes.reduce(
        (sum, minute) => sum + (minute.precipitationChance ?? 0),
        0,
      ) / nextFifteenMinutes.length;
    const averageIntensity =
      nextFifteenMinutes.reduce(
        (sum, minute) => sum + (minute.precipitationIntensity ?? 0),
        0,
      ) / nextFifteenMinutes.length;
    const summaryCondition = forecastNextHour?.summary?.[0]?.condition
      ? formatCondition(forecastNextHour.summary[0].condition ?? "")
      : "Precipitation";

    return [
      `**${summaryCondition}** from ${formatTimeLabel(firstMinute.startTime)} to ${formatTimeLabel(lastMinute.startTime)}.`,
      `- Peak intensity at ${formatTimeLabel(peakMinute.startTime)}: ${formatPrecipitationIntensity(peakMinute.precipitationIntensity)}`,
      `- Next 15 min average chance: ${formatPrecipitationChance(averageChance)}`,
      `- Next 15 min average intensity: ${formatPrecipitationIntensity(averageIntensity)}`,
    ].join("\n");
  }

  const entries = forecastNextHour?.summary?.slice(0, 3) ?? [];
  if (entries.length === 0) {
    return "_Next-hour precipitation unavailable for this location._";
  }

  return entries
    .map((entry) => {
      const windowLabel =
        entry.startTime || entry.endTime
          ? `${formatTimeLabel(entry.startTime)}-${formatTimeLabel(entry.endTime)}`
          : "Next hour";
      const condition = entry.condition
        ? formatCondition(entry.condition)
        : "Precipitation";
      const chance = formatPrecipitationChance(entry.precipitationChance);
      const intensity = formatPrecipitationIntensity(
        entry.precipitationIntensity,
      );

      return `- ${windowLabel}: ${condition}, chance ${chance}, intensity ${intensity}`;
    })
    .join("\n");
}

function renderWeatherAlerts(weatherAlerts?: WeatherData["weatherAlerts"]) {
  const alerts = weatherAlerts?.alerts ?? [];
  if (alerts.length === 0) {
    return "";
  }

  return alerts
    .map((alert) => {
      const severity = alert.severity ? `**${alert.severity}**: ` : "";
      const summary = alert.summary ?? "Weather alert";
      const area = alert.areaName ? ` (${alert.areaName})` : "";
      const expires = alert.expirationDate
        ? ` Expires ${formatTimeLabel(alert.expirationDate)}.`
        : "";
      const source = alert.source ? ` Source: ${alert.source}.` : "";
      const details = alert.detailsUrl ? ` [Details](${alert.detailsUrl})` : "";

      return `- ${severity}${summary}${area}.${expires}${source}${details}`;
    })
    .join("\n");
}

function DefaultLocationForm(props: {
  initialValue: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Set Default Location"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Default Location"
            onSubmit={async (values: { location: string }) => {
              const location = normalizeLocationText(values.location);
              if (!location) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Enter a location",
                  message: "Use a city name or latitude,longitude coordinates.",
                });
                return;
              }

              setIsSubmitting(true);
              try {
                await props.onSave(location);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Default location saved",
                  message: location,
                });
                await popToRoot();
              } finally {
                setIsSubmitting(false);
              }
            }}
          />
          <Action
            title="Open Command Preferences"
            icon={Icon.Gear}
            onAction={openCommandPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter a city name or coordinates to use as the default weather location." />
      <Form.TextField
        id="location"
        title="Location"
        placeholder="Tokyo or 35.6762,139.6503"
        defaultValue={props.initialValue}
      />
    </Form>
  );
}

export default function Command(
  props: LaunchProps<{ arguments: CommandArguments }>,
) {
  const [viewState, setViewState] = useState<ViewState>({
    weather: null,
    placeName: "Loading location…",
    coordinates: "",
    countryCode: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [storedDefaultLocation, setStoredDefaultLocation] = useState<
    string | undefined
  >(undefined);
  const preferences = getPreferenceValues<Preferences>();
  const unit = preferences.unit || "celsius";
  const requestedLocation = normalizeLocationText(props.arguments.location);
  const fallbackLocation = normalizeLocationText(props.fallbackText);
  const configuredDefaultLocation = normalizeLocationText(
    preferences.defaultLocation,
  );
  const effectiveDefaultLocation =
    configuredDefaultLocation || storedDefaultLocation || "";
  const needsDefaultLocationSetup =
    storedDefaultLocation !== undefined && !effectiveDefaultLocation;

  useEffect(() => {
    async function loadStoredDefaultLocation() {
      try {
        const storedValue =
          (await LocalStorage.getItem<string>(SAVED_DEFAULT_LOCATION_KEY)) ||
          "";
        setStoredDefaultLocation(normalizeLocationText(storedValue));
      } catch (error) {
        console.error(error);
        setStoredDefaultLocation("");
      }
    }

    loadStoredDefaultLocation();
  }, []);

  useEffect(() => {
    if (storedDefaultLocation === undefined) {
      return;
    }

    if (needsDefaultLocationSetup && !requestedLocation) {
      setIsLoading(false);
      return;
    }

    async function fetchWeather() {
      try {
        const resolvedLocation = await geocodeLocation(
          requestedLocation || effectiveDefaultLocation || fallbackLocation,
        );
        const { lat, lon, placeName, countryCode } = resolvedLocation;
        const coordinates = formatCoordinates(lat, lon);
        const cachedWeather = await getCachedWeather(lat, lon, countryCode);
        const weather =
          cachedWeather ||
          (await requestWeatherViaProxy(lat, lon, countryCode));

        if (!cachedWeather) {
          await cacheWeather(lat, lon, countryCode, weather);
        }

        setViewState({
          weather,
          placeName,
          coordinates,
          countryCode,
        });
      } catch (error) {
        console.error(error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch weather",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchWeather();
  }, [
    effectiveDefaultLocation,
    fallbackLocation,
    needsDefaultLocationSetup,
    requestedLocation,
    storedDefaultLocation,
  ]);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (needsDefaultLocationSetup && !requestedLocation) {
    return (
      <DefaultLocationForm
        initialValue=""
        onSave={async (value) => {
          await LocalStorage.setItem(SAVED_DEFAULT_LOCATION_KEY, value);
          setStoredDefaultLocation(value);
          setIsLoading(true);
        }}
      />
    );
  }

  if (!viewState.weather || !viewState.weather.currentWeather) {
    return (
      <Detail
        markdown="# No weather data available\nCheck the default location in command preferences."
        actions={
          <ActionPanel>
            <Action
              title="Open Command Preferences"
              icon={Icon.Gear}
              onAction={openCommandPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  const {
    temperature,
    conditionCode,
    humidity,
    windSpeed,
    uvIndex,
    visibility,
    pressure,
    temperatureApparent,
  } = viewState.weather.currentWeather;

  const tempDisplay = Math.round(convertTemperature(temperature, unit));
  const apparentTempDisplay = Math.round(
    convertTemperature(temperatureApparent, unit),
  );
  const conditionLabel = formatCondition(conditionCode);
  const humidityPercent = `${Math.round(humidity * 100)}%`;
  const visibilityKm = `${(visibility / 1000).toFixed(1)} km`;
  const windSpeedLabel = `${windSpeed} km/h`;
  const pressureLabel = `${pressure} hPa`;
  const conditionAsset = getConditionAsset(conditionCode);
  const conditionAssetMarkdown = toFileMarkdownSrc(conditionAsset);
  const humidityIcon = toFileImageSource(getAssetPath("tabler", "droplet.svg"));
  const windIcon = toFileImageSource(getAssetPath("tabler", "wind.svg"));
  const uvIcon = toFileImageSource(getAssetPath("tabler", "uv-index.svg"));
  const visibilityIcon = toFileImageSource(getAssetPath("tabler", "eye.svg"));
  const pressureIcon = toFileImageSource(getAssetPath("tabler", "gauge.svg"));
  const sunriseIcon = toFileImageSource(getAssetPath("tabler", "sunrise.svg"));
  const sunsetIcon = toFileImageSource(getAssetPath("tabler", "sunset.svg"));
  const rainIcon = toFileImageSource(getAssetPath("tabler", "umbrella.svg"));
  const todayForecast = viewState.weather.forecastDaily?.days?.[0];
  const highToday =
    todayForecast?.temperatureMax !== undefined
      ? `${Math.round(convertTemperature(todayForecast.temperatureMax, unit))}°`
      : "--";
  const lowToday =
    todayForecast?.temperatureMin !== undefined
      ? `${Math.round(convertTemperature(todayForecast.temperatureMin, unit))}°`
      : "--";
  const rainToday = formatPrecipitationChance(
    todayForecast?.precipitationChance,
  );
  const sunriseLabel = formatTimeLabel(todayForecast?.sunrise);
  const sunsetLabel = formatTimeLabel(todayForecast?.sunset);
  const hourlyMarkdown = renderHourlyForecast(
    viewState.weather.forecastHourly?.hours,
    unit,
  );
  const dailyMarkdown = renderDailyForecast(
    viewState.weather.forecastDaily?.days,
    unit,
  );
  const nextHourMarkdown = renderNextHourSummary(
    viewState.weather.forecastNextHour,
  );
  const weatherAlertsMarkdown = renderWeatherAlerts(
    viewState.weather.weatherAlerts,
  );

  const markdown = `
<p align="center">
  <img src="${conditionAssetMarkdown}" width="120" height="120" />
</p>
<h1 align="center">${tempDisplay}°</h1>
<p align="center"><strong>${conditionLabel}</strong></p>
<p align="center">⬆️ ${highToday} ⬇️ ${lowToday}, Feels Like: <i>${apparentTempDisplay}°</i></p>

---

### Next Hour

${nextHourMarkdown}

${weatherAlertsMarkdown ? `\n### Weather Alerts\n\n${weatherAlertsMarkdown}\n\n---\n` : ""}

### Hourly Forecast

${hourlyMarkdown}

### Next 7 Days

${dailyMarkdown}
`;

  return (
    <Detail
      navigationTitle={`Current Weather for ${viewState.placeName}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Sunrise"
            text={sunriseLabel}
            icon={{ source: sunriseIcon, tintColor: Color.PrimaryText }}
          />
          <Detail.Metadata.Label
            title="Sunset"
            text={sunsetLabel}
            icon={{ source: sunsetIcon, tintColor: Color.PrimaryText }}
          />
          <Detail.Metadata.Label
            title="Rain Today"
            text={rainToday}
            icon={{ source: rainIcon, tintColor: Color.PrimaryText }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Humidity"
            text={humidityPercent}
            icon={{ source: humidityIcon, tintColor: Color.PrimaryText }}
          />
          <Detail.Metadata.Label
            title="Wind Speed"
            text={windSpeedLabel}
            icon={{ source: windIcon, tintColor: Color.PrimaryText }}
          />
          <Detail.Metadata.Label
            title="UV Index"
            text={String(uvIndex)}
            icon={{ source: uvIcon, tintColor: Color.PrimaryText }}
          />
          <Detail.Metadata.Label
            title="Visibility"
            text={visibilityKm}
            icon={{ source: visibilityIcon, tintColor: Color.PrimaryText }}
          />
          <Detail.Metadata.Label
            title="Pressure"
            text={pressureLabel}
            icon={{ source: pressureIcon, tintColor: Color.PrimaryText }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Support"
            target="https://github.com/sponsors/prashantvc"
            text="GitHub Sponsors"
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Attribution"
            target="https://developer.apple.com/weatherkit/data-source-attribution/"
            text="Other Data Sources"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Buy Me a Coffee"
            icon={Icon.MugSteam}
            url="https://buymeacoffee.com/n9sq9nshww8"
          />
          <Action.OpenInBrowser
            title="GitHub Sponsors"
            icon={Icon.Heart}
            url="https://github.com/sponsors/prashantvc"
          />
          <Action.CopyToClipboard
            title="Copy Raw Weatherkit JSON"
            content={JSON.stringify(viewState.weather, null, 2)}
          />
          <Action
            title="Open Command Preferences"
            icon={Icon.Gear}
            onAction={openCommandPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
