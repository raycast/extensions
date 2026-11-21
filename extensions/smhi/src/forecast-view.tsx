import { Action, ActionPanel, Color, Icon, List, Toast, showToast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  bucketByDay,
  dailySummary,
  feelsLike,
  formatDay,
  formatDecimal,
  formatInteger,
  formatHour,
  formatPrecipAmount,
  formatTemp,
  formatTempExact,
  formatTime,
  formatTimeZoned,
  formatWind,
  hourStart,
  isSameLocalDay,
  type DailySummary,
} from "./format";
import { dayMarkdown, warningMarkdown } from "./markdown";
import { RenameFavoriteForm } from "./rename-favorite-form";
import { SHORTCUTS } from "./shortcuts";
import { SmhiError, valueOr, type SmhiTimeEntry, coordDistanceKm, forgetForecast, loadForecast } from "./smhi";
import { locationTitle, makeLocation, useFavorites } from "./storage";
import { precipTypeLabel, symbolFor } from "./symbols";
import { forgetWarnings, levelPresentation, loadWarnings, warningsAt, type ResolvedWarning } from "./warnings";

const COVERAGE_KM = 50;
const WARNINGS_URL = "https://www.smhi.se/vader/varningar-och-brandrisk/varningar-och-meddelanden";

interface ForecastViewProps {
  lat: number;
  lon: number;
  label: string;
}

export function ForecastView({ lat, lon, label }: ForecastViewProps) {
  const [showingDetail, setShowingDetail] = useState(false);
  const toggleDetail = () => setShowingDetail((v) => !v);

  const {
    data,
    isLoading,
    error,
    revalidate: revalidateForecast,
  } = useCachedPromise(
    // `loadForecast` holds the 30-minute TTL; useCachedPromise only paints the last result while it runs.
    async (lat: number, lon: number) => loadForecast(lon, lat),
    [lat, lon],
    {
      keepPreviousData: true,
      onError: (err) => {
        const outOfCoverage = err instanceof SmhiError && err.isOutOfCoverage;
        showToast({
          style: Toast.Style.Failure,
          title: outOfCoverage ? "Outside SMHI coverage" : "Could not load forecast",
          message: err.message,
        });
      },
    },
  );

  const { data: warningEvents, revalidate: revalidateWarnings } = useCachedPromise(async () => loadWarnings(), [], {
    keepPreviousData: true,
  });

  // `revalidate` is fire-and-forget, so the animated toast can't be awaited to completion, and an
  // animated toast never dismisses itself. Hold on to it and resolve it when loading settles.
  const pendingRefresh = useRef<Toast | undefined>(undefined);
  const refresh = async () => {
    pendingRefresh.current = await showToast({ style: Toast.Style.Animated, title: "Refreshing…" });
    forgetForecast(lon, lat);
    forgetWarnings();
    revalidateForecast();
    revalidateWarnings();
  };
  useEffect(() => {
    const toast = pendingRefresh.current;
    if (!toast || isLoading) return;
    pendingRefresh.current = undefined;
    if (error) {
      // `onError` raises a failure toast of its own.
      toast.hide();
      return;
    }
    toast.style = Toast.Style.Success;
    toast.title = "Forecast updated";
  }, [isLoading, error]);

  const fromMs = hourStart();
  const view = useMemo(() => (data ? splitForecast(data.timeSeries, fromMs) : null), [data, fromMs]);
  const warnings = useMemo(() => (warningEvents ? warningsAt(lat, lon, warningEvents) : []), [warningEvents, lat, lon]);
  const snappedFar = data && coordDistanceKm([lon, lat], data.geometry.coordinates) > COVERAGE_KM;

  const { favorites, addFavorite, removeFavorite, renameFavorite } = useFavorites();
  const baseLocation = makeLocation(lat, lon, label);
  const pinnedRecord = favorites.find((f) => f.id === baseLocation.id);
  const location = pinnedRecord ?? baseLocation;
  const pinned = pinnedRecord !== undefined;
  const togglePin = () => (pinned ? removeFavorite(location.id) : addFavorite(location));

  const common: CommonActions = { showingDetail, toggleDetail, pinned, togglePin, refresh, location, renameFavorite };

  if (error instanceof SmhiError && error.isOutOfCoverage) {
    return (
      <List navigationTitle={locationTitle(location)}>
        <List.EmptyView
          icon={{ source: Icon.Map, tintColor: Color.SecondaryText }}
          title="Outside SMHI coverage"
          description="SMHI's forecast grid covers Sweden and parts of the Nordics."
        />
      </List>
    );
  }

  // The current temperature rides along in the window title, so it's readable even with a day
  // expanded or the search bar focused.
  const current = view?.today[0]?.data.air_temperature;
  const navigationTitle =
    current === undefined ? locationTitle(location) : `${locationTitle(location)} · ${formatTemp(current)}`;

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail} navigationTitle={navigationTitle}>
      {warnings.length > 0 && (
        <List.Section title="Warnings" subtitle={warnings.length > 1 ? `${warnings.length}` : undefined}>
          {warnings.map((warning) => (
            <WarningItem key={`${warning.eventId}-${warning.areaId}`} warning={warning} common={common} />
          ))}
        </List.Section>
      )}
      {/* Refresh lives on the forecast rows, so a failed first load needs a row of its own to retry from.
          It sits in the list rather than replacing it, since warnings load separately and may well have arrived. */}
      {error && !data && (
        <List.Section title="Forecast">
          <List.Item
            title="Could not load forecast"
            subtitle={error.message}
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            actions={
              <ActionPanel>
                <Action
                  title="Retry"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={refresh}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {snappedFar && (
        <List.Section title="Coverage">
          <List.Item
            title="Outside SMHI coverage"
            subtitle="Showing the nearest grid point − values may be unreliable."
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          />
        </List.Section>
      )}
      {view && view.today.length > 0 && (
        <List.Section
          title={isSameLocalDay(view.today[0].time, new Date(fromMs).toISOString()) ? "Today" : "Tomorrow"}
          subtitle={formatDay(view.today[0].time)}
        >
          {view.today.map((entry) => (
            <ForecastItem key={entry.time} entry={entry} common={common} />
          ))}
        </List.Section>
      )}
      {view && view.daily.length > 0 && (
        <List.Section title="Coming days" subtitle={`${view.daily.length}`}>
          {view.daily.map((summary) => (
            <DailyItem key={summary.date} summary={summary} common={common} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function splitForecast(
  timeSeries: SmhiTimeEntry[],
  fromMs: number,
): {
  today: SmhiTimeEntry[];
  daily: DailySummary[];
} {
  // A cached payload can be up to half an hour old, so drop entries whose hour has already passed
  // rather than opening the list on a stale "Now".
  const upcoming = timeSeries.filter((entry) => new Date(entry.time).getTime() >= fromMs);
  const first = upcoming[0];
  if (!first) return { today: [], daily: [] };
  // "Today" = all entries on the local day of the first (current) entry. "Coming days" picks up
  // at the next local midnight.
  const today = upcoming.filter((entry) => isSameLocalDay(entry.time, first.time));
  const afterToday = upcoming.filter((entry) => !isSameLocalDay(entry.time, first.time));
  const dailyEntries = bucketByDay(afterToday);
  const daily = [...dailyEntries.keys()].sort().map((date) => dailySummary(date, dailyEntries.get(date)!));
  while (daily.length > 0 && daily[daily.length - 1].entries.length < 2) daily.pop();
  return { today, daily };
}

interface CommonActions {
  showingDetail: boolean;
  toggleDetail: () => void;
  pinned: boolean;
  togglePin: () => void;
  refresh: () => void;
  location: ReturnType<typeof makeLocation>;
  renameFavorite: (id: string, nickname: string) => Promise<void>;
}

function CommonActionItems({
  showingDetail,
  toggleDetail,
  pinned,
  togglePin,
  refresh,
  location,
  renameFavorite,
}: CommonActions) {
  return (
    <ActionPanel.Section>
      <Action
        title={showingDetail ? "Hide Details" : "Show Details"}
        icon={showingDetail ? Icon.EyeDisabled : Icon.Eye}
        shortcut={SHORTCUTS.toggleDetail}
        onAction={toggleDetail}
      />
      <Action
        title={pinned ? "Remove from Favorites" : "Add to Favorites"}
        icon={pinned ? Icon.StarDisabled : Icon.Star}
        shortcut={SHORTCUTS.toggleFavorite}
        onAction={togglePin}
      />
      {pinned && (
        <Action.Push
          title="Rename Favorite"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={<RenameFavoriteForm location={location} onSubmit={renameFavorite} />}
        />
      )}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
    </ActionPanel.Section>
  );
}

// SMHI-style precipitation accessories. The probability is shown as a colored pill (blue when
// ≥50%, otherwise neutral gray); the amount is the ensemble's min to max range alongside it.
function precipAccessories(minMm: number, maxMm: number, probability: number): List.Item.Accessory[] {
  if (maxMm < 0.05 && probability < 5) return [];
  const accessories: List.Item.Accessory[] = [
    {
      tag: { value: `${Math.round(probability)}%`, color: precipColor(probability) },
      tooltip: "Probability of precipitation",
    },
  ];
  if (maxMm >= 0.05) {
    accessories.push({ text: formatPrecipAmount(minMm, maxMm), tooltip: "Precipitation amount (mm)" });
  }
  return accessories;
}

// Raycast tags use a single color for both text and a tinted background, so they can't express the
// SMHI design's "saturated bg + neutral text" pair. The closest match is to pick colors that
// already read near-black in light mode (and near-white in dark mode); the auto-faded background
// still conveys the blue/gray distinction.
function precipColor(probability: number): { light: string; dark: string } {
  return probability >= 50 ? { light: "#0a3d6b", dark: "#b3dfff" } : { light: "#3a3f47", dark: "#ebeef0" };
}

// Temperature is the one number worth coloring: sub-zero is the thing you scan a Nordic forecast
// for. Everything between freezing and properly warm stays neutral so the color keeps its meaning.
function tempColor(c: number): Color | undefined {
  switch (true) {
    case c < 0:
      return Color.Blue;
    case c >= 25:
      return Color.Red;
    case c >= 20:
      return Color.Orange;
    default:
      return undefined;
  }
}

function tempAccessory(c: number, tooltip: string): List.Item.Accessory {
  return { text: { value: formatTemp(c), color: tempColor(c) }, tooltip };
}

// Air temperature with the apparent temperature in parentheses, the same "value (secondary)"
// shape the wind accessory already uses for its gust, so the row teaches the convention once.
// Spelling out "feels" on all 24 rows made the widest element of the row its most repetitive one.
// The pair is colored by whichever of the two lands in a signal band, preferring the air
// temperature: at air 1° / feels −6° the row still reads blue, which is the whole point in winter.
// Collapses to a single value when both round the same, so the row never reads "11° (11°)".
function tempPairAccessory(tempC: number, feelsC: number): List.Item.Accessory {
  const same = formatTemp(feelsC) === formatTemp(tempC);
  return {
    text: {
      value: same ? formatTemp(tempC) : `${formatTemp(tempC)} (${formatTemp(feelsC)})`,
      color: tempColor(tempC) ?? tempColor(feelsC),
    },
    tooltip: same
      ? `${formatTempExact(tempC)}, and feels like it`
      : `${formatTempExact(tempC)} · feels like ${formatTempExact(feelsC)} (apparent temperature, BoM formula)`,
  };
}

function ForecastItem({ entry, common }: { entry: SmhiTimeEntry; common: CommonActions }) {
  const d = entry.data;
  const symbol = symbolFor(d.symbol_code);
  const feels = feelsLike(d.air_temperature, d.wind_speed, d.relative_humidity);

  // With the detail pane open the list column is too narrow for the wind and precipitation
  // columns, so the two temperatures stay and the pane carries the rest.
  const accessories: List.Item.Accessory[] = common.showingDetail
    ? [tempPairAccessory(d.air_temperature, feels)]
    : [
        tempPairAccessory(d.air_temperature, feels),
        { text: formatWind(d.wind_speed, d.wind_from_direction, d.wind_speed_of_gust), tooltip: "Wind speed (gust)" },
        ...precipAccessories(d.precipitation_amount_min, d.precipitation_amount_max, d.probability_of_precipitation),
      ];

  return (
    <List.Item
      title={formatHour(entry.time)}
      subtitle={symbol.label}
      icon={symbol.emoji}
      accessories={accessories}
      detail={<List.Item.Detail metadata={<HourMetadata entry={entry} />} />}
      actions={
        <ActionPanel>
          <CommonActionItems {...common} />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Time and Summary"
              content={`${formatTime(entry.time)} − ${symbol.label}, ${formatTemp(d.air_temperature)} (feels ${formatTemp(feels)})`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function HourMetadata({ entry }: { entry: SmhiTimeEntry }) {
  const d = entry.data;
  const symbol = symbolFor(d.symbol_code);
  const feels = feelsLike(d.air_temperature, d.wind_speed, d.relative_humidity);
  const cloudBase = valueOr(d.cloud_base_altitude);
  const frozenPart = valueOr(d.precipitation_frozen_part, -9);
  const Metadata = List.Item.Detail.Metadata;
  return (
    <Metadata>
      <Metadata.Label title="Conditions" icon={symbol.emoji} text={symbol.label} />
      <Metadata.Label title="Time" text={`${formatTimeZoned(entry.time)} · ${formatDay(entry.time)}`} />
      <Metadata.Separator />
      <Metadata.Label
        title="Temperature"
        icon={Icon.Temperature}
        text={{ value: formatTempExact(d.air_temperature), color: tempColor(d.air_temperature) }}
      />
      <Metadata.Label title="Feels like" text={formatTempExact(feels)} />
      <Metadata.Separator />
      <Metadata.Label title="Wind" icon={Icon.Wind} text={`${formatWind(d.wind_speed, d.wind_from_direction)} m/s`} />
      <Metadata.Label title="Gust" text={`${formatInteger(d.wind_speed_of_gust)} m/s`} />
      <Metadata.Separator />
      {d.precipitation_amount_max < 0.05 && d.probability_of_precipitation < 5 ? (
        <Metadata.Label title="Precipitation" text="None expected" />
      ) : (
        <Metadata.TagList title="Precipitation">
          <Metadata.TagList.Item
            text={`${Math.round(d.probability_of_precipitation)} % chance`}
            color={precipColor(d.probability_of_precipitation)}
          />
          <Metadata.TagList.Item
            text={`${formatPrecipAmount(d.precipitation_amount_min, d.precipitation_amount_max)} mm`}
          />
          {d.predominant_precipitation_type_at_surface !== 0 && (
            <Metadata.TagList.Item text={precipTypeLabel(d.predominant_precipitation_type_at_surface)} />
          )}
        </Metadata.TagList>
      )}
      {frozenPart !== undefined && frozenPart > 0 && (
        <Metadata.Label title="Frozen share" icon={Icon.Snowflake} text={`${Math.round(frozenPart * 100)} %`} />
      )}
      {d.thunderstorm_probability > 0 && (
        <Metadata.Label title="Thunderstorm" icon={Icon.Bolt} text={`${d.thunderstorm_probability} %`} />
      )}
      <Metadata.Separator />
      <Metadata.Label title="Humidity" icon={Icon.Droplets} text={`${Math.round(d.relative_humidity)} %`} />
      <Metadata.Label title="Pressure" text={`${formatInteger(d.air_pressure_at_mean_sea_level)} hPa`} />
      <Metadata.Label title="Visibility" icon={Icon.Eye} text={`${formatDecimal(d.visibility_in_air)} km`} />
      <Metadata.TagList title="Cloud cover">
        <Metadata.TagList.Item text={`${Math.round((d.cloud_area_fraction / 8) * 100)} % total`} />
        <Metadata.TagList.Item text={`low ${d.low_type_cloud_area_fraction}/8`} />
        <Metadata.TagList.Item text={`mid ${d.medium_type_cloud_area_fraction}/8`} />
        <Metadata.TagList.Item text={`high ${d.high_type_cloud_area_fraction}/8`} />
      </Metadata.TagList>
      {cloudBase !== undefined && <Metadata.Label title="Cloud base" text={`${formatInteger(cloudBase)} m`} />}
    </Metadata>
  );
}

function DailyItem({ summary, common }: { summary: DailySummary; common: CommonActions }) {
  const symbol = symbolFor(summary.symbolCode);
  const temps = [
    tempAccessory(summary.maxTemp, "Highest temperature"),
    tempAccessory(summary.minTemp, "Lowest temperature"),
  ];
  const accessories = common.showingDetail
    ? temps
    : [...temps, ...precipAccessories(summary.precipMinMm, summary.precipMaxMm, summary.maxPrecipProb)];

  return (
    <List.Item
      title={formatDay(summary.representativeTime)}
      subtitle={symbol.label}
      icon={symbol.emoji}
      accessories={accessories}
      detail={<List.Item.Detail markdown={dayMarkdown(summary)} />}
      actions={
        <ActionPanel>
          <CommonActionItems {...common} />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Day Summary"
              content={`${formatDay(summary.representativeTime)} − ${symbol.label}, ${formatTemp(summary.maxTemp)}/${formatTemp(summary.minTemp)}`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function WarningItem({ warning, common }: { warning: ResolvedWarning; common: CommonActions }) {
  const pres = levelPresentation(warning.level);
  return (
    <List.Item
      title={warning.eventLabel}
      subtitle={warning.areaLabel}
      icon={{ source: pres.icon, tintColor: pres.color }}
      accessories={
        common.showingDetail
          ? []
          : [
              { tag: { value: pres.label, color: pres.color } },
              { date: new Date(warning.start), tooltip: "Approximate start" },
            ]
      }
      detail={<List.Item.Detail markdown={warningMarkdown(warning)} metadata={<WarningMetadata warning={warning} />} />}
      actions={
        <ActionPanel>
          <CommonActionItems {...common} />
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open SMHI Warnings" url={WARNINGS_URL} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Warning"
              content={`${pres.label} · ${warning.eventLabel} (${warning.areaLabel})`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function WarningMetadata({ warning }: { warning: ResolvedWarning }) {
  const pres = levelPresentation(warning.level);
  const Metadata = List.Item.Detail.Metadata;
  return (
    <Metadata>
      <Metadata.TagList title="Level">
        <Metadata.TagList.Item text={pres.label} color={pres.color} />
      </Metadata.TagList>
      <Metadata.Label title="Area" text={warning.areaLabel} />
      <Metadata.Separator />
      <Metadata.Label title="From" text={`${formatTime(warning.start)} · ${formatDay(warning.start)}`} />
      {warning.end && <Metadata.Label title="Until" text={`${formatTime(warning.end)} · ${formatDay(warning.end)}`} />}
    </Metadata>
  );
}
