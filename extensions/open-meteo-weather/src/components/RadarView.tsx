import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { WeatherActions } from "./WeatherActions";
import { useRadar } from "../hooks/useRadar";
import { WeatherSettings } from "../hooks/useWeatherSettings";
import { Forecast, GeoResult, fmt, formatPlace } from "../lib/api";
import { nowcastSummary } from "../lib/build";
import { buildRadarShareSvg } from "../lib/share";
import { renderRadarLoadingCard, svgToMarkdown } from "../lib/svg";
import { escapeMarkdown } from "../lib/text";
import { styleFor } from "../lib/themes";
import { MAX_ZOOM, MIN_ZOOM, RADAR_ZOOM, tilePoint, tileToLatLon } from "../lib/tiles";

/** Markdown panel width; matches the Today view. */
const RADAR_WIDTH = 420;

/** Pan step per keypress, in tiles at the current zoom (≈ a quarter of the frame). */
const PAN_TILES = 0.8;

interface MapState {
  placeId: number;
  latitude: number;
  longitude: number;
  zoom: number;
}

export function RadarView(props: {
  settings: WeatherSettings;
  place: GeoResult;
  forecast: Forecast | undefined;
  isLoading: boolean;
  refresh: () => void;
}) {
  const { settings, place, forecast } = props;
  const style = styleFor(
    settings.theme,
    forecast?.current.weather_code ?? 0,
    forecast ? forecast.current.is_day === 1 : true,
  );

  const home = (): MapState => ({
    placeId: place.id,
    latitude: place.latitude,
    longitude: place.longitude,
    zoom: RADAR_ZOOM,
  });
  const [stored, setStored] = useState<MapState | undefined>();
  const map: MapState = stored?.placeId === place.id ? stored : home();

  // Functional updates: two quick keypresses must not both start from the same snapshot.
  const update = (fn: (m: MapState) => MapState) => setStored((prev) => fn(prev?.placeId === place.id ? prev : home()));
  const pan = (dx: number, dy: number) =>
    update((m) => {
      const p = tilePoint(m.latitude, m.longitude, m.zoom);
      const ll = tileToLatLon(p.x + dx * PAN_TILES, p.y + dy * PAN_TILES, m.zoom);
      return { ...m, latitude: ll.latitude, longitude: ll.longitude };
    });
  const zoomBy = (d: number) => {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, map.zoom + d));
    if (zoom === map.zoom) {
      // Reaching the bound is not an error.
      void showToast({
        style: Toast.Style.Success,
        title: d > 0 ? "Already at maximum zoom" : "Already at minimum zoom",
      });
      return;
    }
    update((m) => ({ ...m, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, m.zoom + d)) }));
  };
  const recenter = () => setStored(home());

  const radar = useRadar(place, { latitude: map.latitude, longitude: map.longitude }, map.zoom, style, RADAR_WIDTH);
  const nowcast = forecast ? nowcastSummary(forecast) : undefined;

  const shareSvg = radar.fullSvg
    ? () =>
        buildRadarShareSvg(
          radar.fullSvg!,
          [
            {
              label: "Frame",
              value: radar.frameTime?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "—",
            },
            { label: "Zoom", value: `Level ${map.zoom}` },
            ...(forecast
              ? [
                  { label: "Now", value: `${Math.round(forecast.current.temperature_2m)}°${settings.unitSymbol}` },
                  { label: "Rain Today", value: fmt(forecast.daily.precipitation_probability_max[0], "%") },
                ]
              : []),
            { label: "Radar", value: "RainViewer" },
          ],
          style,
        )
    : undefined;

  return (
    <Detail
      isLoading={radar.isLoading || props.isLoading}
      navigationTitle={`${formatPlace(place)} — Radar`}
      markdown={
        radar.markdown ??
        (radar.isLoading
          ? svgToMarkdown(renderRadarLoadingCard(formatPlace(place), style, RADAR_WIDTH), "Loading radar")
          : `## Radar unavailable\n\n${escapeMarkdown(radar.error?.message ?? "Check your connection and try again.")}\n\nPress ⌘R to retry.`)
      }
      metadata={
        <Detail.Metadata>
          {radar.loopRange && <Detail.Metadata.Label title="Animation Loop" icon={Icon.Video} text={radar.loopRange} />}
          {radar.frameTime && (
            <Detail.Metadata.Label
              title="Latest Frame"
              icon={Icon.Clock}
              text={radar.frameTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            />
          )}
          <Detail.Metadata.Label title="Updates" icon={Icon.ArrowClockwise} text="New frame every ~10 minutes" />
          <Detail.Metadata.Label title="Zoom" icon={Icon.MagnifyingGlass} text={`Level ${map.zoom}`} />
          {nowcast && <Detail.Metadata.Label title="Rain Nowcast" icon={Icon.CloudRain} text={nowcast} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Radar Data" target="https://www.rainviewer.com" text="RainViewer" />
          <Detail.Metadata.Link title="Map" target="https://www.esri.com" text="© Esri · © OpenStreetMap" />
        </Detail.Metadata>
      }
      actions={
        <WeatherActions
          settings={settings}
          refresh={() => {
            radar.revalidate();
            props.refresh();
          }}
          summary={`Precipitation radar for ${formatPlace(place)}`}
          shareSvg={shareSvg}
          shareGifPath={radar.gifPath}
        >
          <ActionPanel.Section title="Map">
            <Action
              title="Zoom in"
              icon={Icon.Plus}
              onAction={() => zoomBy(1)}
              shortcut={{
                macOS: { modifiers: ["ctrl", "opt"], key: "=" },
                Windows: { modifiers: ["ctrl", "alt"], key: "=" },
              }}
            />
            <Action
              title="Zoom out"
              icon={Icon.Minus}
              onAction={() => zoomBy(-1)}
              shortcut={{
                macOS: { modifiers: ["ctrl", "opt"], key: "-" },
                Windows: { modifiers: ["ctrl", "alt"], key: "-" },
              }}
            />
            {/* Zoom and pan share the ⌃⌥ modifier pair, chosen to avoid
                  system and Raycast bindings. */}
            <Action
              title="Pan North"
              icon={Icon.ArrowUp}
              onAction={() => pan(0, -1)}
              shortcut={{
                macOS: { modifiers: ["ctrl", "opt"], key: "arrowUp" },
                Windows: { modifiers: ["ctrl", "alt"], key: "arrowUp" },
              }}
            />
            <Action
              title="Pan South"
              icon={Icon.ArrowDown}
              onAction={() => pan(0, 1)}
              shortcut={{
                macOS: { modifiers: ["ctrl", "opt"], key: "arrowDown" },
                Windows: { modifiers: ["ctrl", "alt"], key: "arrowDown" },
              }}
            />
            <Action
              title="Pan West"
              icon={Icon.ArrowLeft}
              onAction={() => pan(-1, 0)}
              shortcut={{
                macOS: { modifiers: ["ctrl", "opt"], key: "arrowLeft" },
                Windows: { modifiers: ["ctrl", "alt"], key: "arrowLeft" },
              }}
            />
            <Action
              title="Pan East"
              icon={Icon.ArrowRight}
              onAction={() => pan(1, 0)}
              shortcut={{
                macOS: { modifiers: ["ctrl", "opt"], key: "arrowRight" },
                Windows: { modifiers: ["ctrl", "alt"], key: "arrowRight" },
              }}
            />
            <Action
              title="Reset View"
              icon={Icon.Pin}
              onAction={recenter}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "." },
                Windows: { modifiers: ["ctrl", "shift"], key: "." },
              }}
            />
          </ActionPanel.Section>
        </WeatherActions>
      }
    />
  );
}
