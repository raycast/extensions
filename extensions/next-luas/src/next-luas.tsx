import { Action, ActionPanel, Color, Icon, List, Toast, open, openExtensionPreferences, showToast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistance, rankStopsByDistance } from "./lib/distance";
import { fetchForecast, isNormalServiceMessage, loadStops } from "./lib/luas-api";
import { clearLocationCache, resolveLocation } from "./lib/location";
import type { Forecast, ResolvedLocation, Stop, StopWithDistance, Tram } from "./types";

const FORECAST_REFRESH_MS = 20_000;
const LOCATION_REFRESH_MS = 60_000;
const LUAS_WEB_URL = "https://www.luas.ie/";

export default function Command() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [stopsError, setStopsError] = useState<string | null>(null);
  const [location, setLocation] = useState<ResolvedLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [ranked, setRanked] = useState<StopWithDistance[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const selectedStop = ranked[selectedIndex];
  const top3 = ranked.slice(0, 3);

  const warnedRef = useRef(false);

  // 1. Load stops once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { stops: loaded, source } = await loadStops();
        if (cancelled) return;
        setStops(loaded);
        if (source === "fallback") {
          showToast({
            style: Toast.Style.Failure,
            title: "Using bundled stops list",
            message: "Could not reach TII. Distances will still work.",
          });
        }
      } catch (err) {
        if (cancelled) return;
        setStopsError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Resolve location on mount and every 60s.
  const refreshLocation = useCallback(async (opts?: { force?: boolean }) => {
    try {
      const loc = await resolveLocation({ force: opts?.force });
      setLocation(loc);
      setLocationError(null);
      if (loc.warning && !warnedRef.current) {
        warnedRef.current = true;
        showToast({ style: Toast.Style.Failure, title: "Location", message: loc.warning });
      }
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    refreshLocation({ force: true });
    const id = setInterval(() => refreshLocation({ force: true }), LOCATION_REFRESH_MS);
    return () => clearInterval(id);
  }, [refreshLocation]);

  // 3. When stops or location change, rerank.
  useEffect(() => {
    if (!location || stops.length === 0) return;
    const next = rankStopsByDistance(location.coords, stops);
    setRanked(next);
    // Keep selection stable if possible; otherwise reset.
    setSelectedIndex((prev) => (prev < Math.min(3, next.length) ? prev : 0));
  }, [stops, location]);

  // 4. Fetch forecast for the selected stop. Silent refresh every 20s.
  const refreshForecast = useCallback(async (stopAbv: string, silent: boolean) => {
    if (!silent) setIsLoading(true);
    try {
      const fc = await fetchForecast(stopAbv);
      setForecast(fc);
      setForecastError(null);
    } catch (err) {
      setForecastError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedStop) return;
    refreshForecast(selectedStop.abv, false);
    const id = setInterval(() => refreshForecast(selectedStop.abv, true), FORECAST_REFRESH_MS);
    return () => clearInterval(id);
  }, [selectedStop?.abv, refreshForecast]);

  // 5. First-load gate.
  useEffect(() => {
    if (stops.length > 0 && location) setIsLoading((prev) => (forecast ? false : prev));
  }, [stops, location, forecast]);

  const onRefresh = useCallback(async () => {
    clearLocationCache();
    await refreshLocation({ force: true });
    if (selectedStop) await refreshForecast(selectedStop.abv, false);
  }, [refreshLocation, refreshForecast, selectedStop]);

  const onCycleStop = useCallback(() => {
    if (top3.length === 0) return;
    setSelectedIndex((i) => (i + 1) % top3.length);
  }, [top3.length]);

  // ---------- render ----------

  if (locationError && !location) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.LivestreamDisabled, tintColor: Color.Red }}
          title="Could not determine your location"
          description={locationError}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => refreshLocation({ force: true })} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (stopsError && stops.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could not load stops"
          description={stopsError}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRefresh} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Next Luas">
      {selectedStop && (
        <ClosestHeader
          stop={selectedStop}
          location={location}
          onRefresh={onRefresh}
          onCycleStop={top3.length > 1 ? onCycleStop : undefined}
          nextStopName={top3.length > 1 ? top3[(selectedIndex + 1) % top3.length].name : undefined}
        />
      )}

      {forecast && !isNormalServiceMessage(forecast.message) && (
        <List.Section title="Service Message">
          <List.Item
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title={forecast.message}
            actions={<ActionPanel>{defaultActions(onRefresh, onCycleStop, top3)}</ActionPanel>}
          />
        </List.Section>
      )}

      {forecastError && (
        <List.Section title="Forecast Error">
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Could not load forecast"
            subtitle={forecastError}
            actions={<ActionPanel>{defaultActions(onRefresh, onCycleStop, top3)}</ActionPanel>}
          />
        </List.Section>
      )}

      {forecast && (
        <>
          <TramSection
            title="Inbound"
            trams={forecast.inbound}
            onRefresh={onRefresh}
            onCycleStop={onCycleStop}
            top3={top3}
          />
          <TramSection
            title="Outbound"
            trams={forecast.outbound}
            onRefresh={onRefresh}
            onCycleStop={onCycleStop}
            top3={top3}
          />
        </>
      )}
    </List>
  );
}

function ClosestHeader({
  stop,
  location,
  onRefresh,
  onCycleStop,
  nextStopName,
}: {
  stop: StopWithDistance;
  location: ResolvedLocation | null;
  onRefresh: () => void;
  onCycleStop?: () => void;
  nextStopName?: string;
}) {
  const lineColor = stop.line === "Red" ? Color.Red : Color.Green;
  const sourceLabel =
    location?.source === "manual"
      ? "Manual"
      : location?.source === "corelocation"
        ? "GPS"
        : location?.source === "ip"
          ? "IP"
          : "Unknown";

  return (
    <List.Section title="Closest Stop">
      <List.Item
        icon={{ source: Icon.Pin, tintColor: lineColor }}
        title={stop.name}
        subtitle={`${stop.line} Line · ${formatDistance(stop.distanceMeters)} away`}
        accessories={[{ tag: { value: sourceLabel, color: Color.SecondaryText } }, { text: stop.abv }]}
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            {onCycleStop && nextStopName && (
              <Action
                title={`Switch to ${nextStopName}`}
                icon={Icon.Switch}
                onAction={onCycleStop}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            )}
            <Action title="Open Luas.ie" icon={Icon.Globe} onAction={() => open(LUAS_WEB_URL)} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

function TramSection({
  title,
  trams,
  onRefresh,
  onCycleStop,
  top3,
}: {
  title: string;
  trams: Tram[];
  onRefresh: () => void;
  onCycleStop: () => void;
  top3: StopWithDistance[];
}) {
  const hasRealTrams = trams.some((t) => t.dueMins && t.destination.toLowerCase() !== "no trams forecast");

  return (
    <List.Section title={title}>
      {!hasRealTrams && (
        <List.Item
          icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
          title="No trams forecast"
          actions={<ActionPanel>{defaultActions(onRefresh, onCycleStop, top3)}</ActionPanel>}
        />
      )}
      {hasRealTrams &&
        trams.map((t, i) => {
          const due = t.dueMins.toUpperCase();
          const titleText = due === "DUE" ? "DUE" : due ? `${due} min` : "—";
          const clipboardText = `Next tram to ${t.destination}: ${
            due === "DUE" ? "DUE" : due ? `${due} min` : "unknown"
          }`;
          return (
            <List.Item
              key={`${title}-${i}-${t.destination}-${t.dueMins}`}
              icon={{ source: Icon.Train, tintColor: due === "DUE" ? Color.Green : Color.PrimaryText }}
              title={titleText}
              subtitle={t.destination}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Tram Info"
                    content={clipboardText}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  {defaultActions(onRefresh, onCycleStop, top3)}
                </ActionPanel>
              }
            />
          );
        })}
    </List.Section>
  );
}

function defaultActions(onRefresh: () => void, onCycleStop: () => void, top3: StopWithDistance[]) {
  return (
    <>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={onRefresh}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      {top3.length > 1 && (
        <Action
          title="Switch to Next-nearest Stop"
          icon={Icon.Switch}
          onAction={onCycleStop}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
        />
      )}
      <Action title="Open Luas.ie" icon={Icon.Globe} onAction={() => open(LUAS_WEB_URL)} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </>
  );
}
