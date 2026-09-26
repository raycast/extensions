import { Icon, LaunchType, MenuBarExtra, launchCommand, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useWeatherData } from "./hooks/useWeatherData";
import { useWeatherSettings } from "./hooks/useWeatherSettings";
import { fmt, formatPlace, formatPrecip, usAqiInfo } from "./lib/api";
import { nextHours, nowcastSummary, yesterdayComparison } from "./lib/build";
import { iconFor, labelFor, tagColorFor } from "./lib/conditions";
import { buildNowShareSvg, shareForecastImage } from "./lib/share";

async function openWeather() {
  try {
    await launchCommand({ name: "weather", type: LaunchType.UserInitiated });
  } catch {
    await showHUD("Couldn't open Weather");
  }
}

export default function MenuBarWeather() {
  const settings = useWeatherSettings();
  const { active, units, unitSymbol } = settings;
  const { forecast, airQuality, alerts, isLoading, error, revalidate } = useWeatherData(
    active,
    units,
    settings.forecastDays,
  );

  if (!active) {
    if (settings.isLoading) return <MenuBarExtra icon={Icon.Cloud} tooltip="Weather" isLoading />;
    return (
      <MenuBarExtra icon={Icon.Cloud} tooltip="Weather" isLoading={isLoading}>
        <MenuBarExtra.Item title="Set Up Weather…" icon={Icon.Gear} onAction={openWeather} />
      </MenuBarExtra>
    );
  }

  const cur = forecast?.current;
  const title = cur ? `${Math.round(cur.temperature_2m)}°` : "…";
  const icon = cur ? { source: iconFor(cur.weather_code), tintColor: tagColorFor(cur.weather_code) } : Icon.Cloud;
  const nowcast = forecast ? nowcastSummary(forecast) : undefined;
  const vsYesterday = forecast ? yesterdayComparison(forecast) : undefined;
  const aqi = airQuality?.current.us_aqi;

  return (
    <MenuBarExtra icon={icon} title={title} tooltip={formatPlace(active)} isLoading={isLoading}>
      <MenuBarExtra.Section title={formatPlace(active)}>
        {!forecast && !isLoading && (
          <MenuBarExtra.Item
            title="Couldn't load the forecast · Retry"
            subtitle={error?.message}
            icon={Icon.ExclamationMark}
            onAction={revalidate}
          />
        )}
        {cur && forecast && (
          <MenuBarExtra.Item
            title={`${labelFor(cur.weather_code)} · feels like ${fmt(cur.apparent_temperature, "°")}${unitSymbol}`}
            subtitle={`H ${Math.round(forecast.daily.temperature_2m_max[0])}° L ${Math.round(forecast.daily.temperature_2m_min[0])}°`}
            icon={{ source: iconFor(cur.weather_code), tintColor: tagColorFor(cur.weather_code) }}
            onAction={openWeather}
          />
        )}
        {nowcast && <MenuBarExtra.Item title={nowcast} icon={Icon.CloudRain} onAction={openWeather} />}
        {vsYesterday && <MenuBarExtra.Item title={vsYesterday} icon={Icon.Temperature} onAction={openWeather} />}
        {aqi != null && (
          <MenuBarExtra.Item
            title={`Air quality ${Math.round(aqi)} · ${usAqiInfo(aqi).label}`}
            icon={Icon.Wind}
            onAction={openWeather}
          />
        )}
      </MenuBarExtra.Section>
      {alerts.length > 0 && (
        <MenuBarExtra.Section title="Alerts">
          {alerts.map((a) => (
            <MenuBarExtra.Item
              key={a.id}
              title={a.properties.event}
              icon={Icon.ExclamationMark}
              onAction={openWeather}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {forecast && (
        <MenuBarExtra.Section title="Next Hours">
          {nextHours(forecast, 6)
            .slice(1)
            .map((h) => (
              <MenuBarExtra.Item
                key={h.label}
                title={`${h.label}  ·  ${Math.round(h.temp)}°${unitSymbol}${(h.precip ?? 0) >= 0.1 ? `  ·  ${formatPrecip(h.precip, forecast.units)}` : ""}`}
                onAction={openWeather}
              />
            ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Weather" icon={Icon.AppWindow} onAction={openWeather} />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
        {forecast && process.platform === "darwin" && (
          <MenuBarExtra.Item
            title="Copy Forecast Image"
            icon={Icon.Image}
            onAction={async () => {
              try {
                await shareForecastImage(
                  buildNowShareSvg(forecast, active, settings.theme, unitSymbol, settings.windUnit),
                  "copy",
                  active.name.toLowerCase().replace(/\s+/g, "-"),
                );
              } catch (error) {
                await showFailureToast(error, { title: "Could not render the image" });
              }
            }}
          />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
