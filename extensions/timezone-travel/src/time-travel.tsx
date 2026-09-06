import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CITIES } from "./cities";
import type { City } from "./cities";
import { loadCities } from "./city-storage";
import { ManageCities } from "./manage-cities";
import {
  describeDayOffset,
  formatDateInZone,
  formatTimeInZone,
  formatTimeZoneName,
  getCitySnapshot,
  parseTimeQueryResult,
  shiftInstant,
} from "./time";
import type { TimeQueryIssue } from "./time";

type QueryState = "idle" | "valid" | TimeQueryIssue;

function formatReadingSummary(reading: { city: City; time: string; date: string }): string {
  return `${reading.city.label}: ${reading.time}, ${reading.date}`;
}

function describeQueryIssue(issue: TimeQueryIssue, query: string, anchorCity: City): string {
  switch (issue) {
    case "incomplete":
      return "Keep typing — try 14:30, tomorrow 9am, or +3h";
    case "out-of-range":
      return "That time is outside the clock — use 00:00–23:59 or 1–12 am/pm";
    case "unavailable":
      return `“${query.trim()}” isn't a unique time in ${anchorCity.label} on this date — try another hour`;
    case "unrecognized":
      return `Couldn't read “${query.trim()}” — try 14:30, tomorrow 9am, or +3h`;
  }
}

function TimeTravelActions(props: {
  clipboardSummary: string;
  selectedSummary: string;
  cityLabel: string;
  onMove: (minutes: number) => void;
  onNow: () => void;
  onCitiesChange: (cities: City[]) => void;
}) {
  const { clipboardSummary, selectedSummary, cityLabel, onMove, onNow, onCitiesChange } = props;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard title={`Copy ${cityLabel} Time`} content={selectedSummary} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Move Through Time">
        <Action
          title="Move Forward 1 Hour"
          icon={Icon.ArrowRight}
          shortcut={{
            macOS: { modifiers: ["opt"], key: "arrowRight" },
            Windows: { modifiers: ["alt"], key: "arrowRight" },
          }}
          onAction={() => onMove(60)}
        />
        <Action
          title="Move Back 1 Hour"
          icon={Icon.ArrowLeft}
          shortcut={{
            macOS: { modifiers: ["opt"], key: "arrowLeft" },
            Windows: { modifiers: ["alt"], key: "arrowLeft" },
          }}
          onAction={() => onMove(-60)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Return to Now"
          icon={Icon.RotateClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onNow}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy All Local Times"
          content={clipboardSummary}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.Push
          title="Manage Cities"
          icon={Icon.Gear}
          target={<ManageCities onChange={onCitiesChange} />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.TimeTravel>();
  const [cities, setCities] = useState<City[]>(DEFAULT_CITIES);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const use24Hour = preferences.clockFormat === "24";
  const anchorCity = cities[0];
  const moveShortcutHint = process.platform === "darwin" ? "⌥←/→" : "Alt ←/→";

  const [moment, setMoment] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [queryState, setQueryState] = useState<QueryState>("idle");
  const [isLive, setIsLive] = useState(true);
  const queryBase = useRef<Date | null>(null);
  const readings = useMemo(
    () =>
      cities.map((city) => ({
        city,
        ...getCitySnapshot(moment, city.timeZone),
        date: formatDateInZone(moment, city.timeZone),
        time: formatTimeInZone(moment, city.timeZone, use24Hour),
        timeZoneName: formatTimeZoneName(moment, city.timeZone),
      })),
    [cities, moment, use24Hour],
  );
  const clipboardSummary = useMemo(() => readings.map(formatReadingSummary).join("\n"), [readings]);

  useEffect(() => {
    let isActive = true;
    loadCities()
      .then((storedCities) => {
        if (isActive) setCities(storedCities);
      })
      .catch(() => showToast(Toast.Style.Failure, "Could not load your saved cities"))
      .finally(() => {
        if (isActive) setIsLoadingCities(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => setMoment(new Date()), 15_000);
    return () => clearInterval(timer);
  }, [isLive]);

  const resetTimeQuery = useCallback(() => {
    queryBase.current = null;
    setQuery("");
    setQueryState("idle");
  }, []);

  const move = useCallback(
    (minutes: number) => {
      resetTimeQuery();
      setMoment((current) => shiftInstant(current, minutes));
      setIsLive(false);
    },
    [resetTimeQuery],
  );

  const returnToNow = useCallback(() => {
    resetTimeQuery();
    setMoment(new Date());
    setIsLive(true);
  }, [resetTimeQuery]);

  const updateCities = useCallback(
    (nextCities: City[]) => {
      resetTimeQuery();
      setCities(nextCities);
    },
    [resetTimeQuery],
  );

  const changeQuery = useCallback(
    (text: string) => {
      setQuery(text);
      if (!text.trim()) {
        queryBase.current = null;
        setQueryState("idle");
        return;
      }
      if (!anchorCity) {
        setQueryState("unrecognized");
        return;
      }

      const base = queryBase.current ?? moment;
      queryBase.current = base;
      const result = parseTimeQueryResult(text, base, anchorCity.timeZone);
      if (result.status === "invalid") {
        setQueryState(result.reason);
        return;
      }

      setMoment(result.date);
      setQueryState("valid");
      setIsLive(text.trim().toLowerCase() === "now");
    },
    [anchorCity, moment],
  );

  if (isLoadingCities) {
    return (
      <List
        isLoading
        navigationTitle="Timezone Travel"
        searchText=""
        onSearchTextChange={() => undefined}
        searchBarPlaceholder="Loading cities…"
      />
    );
  }

  if (!anchorCity) {
    return (
      <List searchBarPlaceholder="Configure at least one city to begin">
        <List.EmptyView
          title="Choose Your First City"
          description="Search for a city to start comparing local times."
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action.Push
                title="Manage Cities"
                icon={Icon.Gear}
                target={<ManageCities onChange={updateCities} />}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const anchorReading = `${readings[0].date} at ${readings[0].time}`;
  const hasQueryIssue = queryState !== "idle" && queryState !== "valid";
  const sectionSubtitle = hasQueryIssue
    ? describeQueryIssue(queryState, query, anchorCity)
    : `Times entered use ${anchorCity.label} · ${anchorReading}`;

  return (
    <List
      filtering={false}
      navigationTitle="Timezone Travel"
      searchText={query}
      onSearchTextChange={changeQuery}
      searchBarPlaceholder={`Time in ${anchorCity.label}: 14:30, tomorrow 9am, +3h`}
    >
      <List.Section
        title={`${isLive ? "NOW" : "TIME TRAVEL"}  ·  ${moveShortcutHint} 1H`}
        subtitle={sectionSubtitle}
      >
        {readings.map((reading, index) => {
          const { city } = reading;
          const dayOffset = reading.daySerial - readings[0].daySerial;
          const dayDifference = describeDayOffset(dayOffset);

          return (
            <List.Item
              key={city.timeZone}
              icon={{
                value: {
                  source: reading.hour >= 7 && reading.hour < 19 ? Icon.Sun : Icon.Moon,
                  tintColor: Color.SecondaryText,
                },
                tooltip: reading.hour >= 7 && reading.hour < 19 ? "Local daytime" : "Local nighttime",
              }}
              title={{ value: city.label, tooltip: reading.timeZoneName }}
              keywords={[city.timeZone, reading.timeZoneName]}
              accessories={[
                ...(index === 0
                  ? [
                      {
                        tag: { value: "Anchor", color: Color.Blue },
                        tooltip: `Times entered in search use ${city.label}`,
                      },
                    ]
                  : []),
                ...(dayOffset === 0
                  ? []
                  : [
                      {
                        tag: {
                          value: dayDifference,
                          color: dayOffset > 0 ? Color.Orange : Color.Purple,
                        },
                        tooltip: `${dayDifference} relative to ${anchorCity.label}`,
                      },
                    ]),
                {
                  tag: {
                    value: reading.isWorkingHour ? "Working hours" : "Outside work",
                    color: reading.isWorkingHour ? Color.Green : Color.Orange,
                  },
                  tooltip: reading.isWorkingHour ? "Between 9 AM and 5 PM" : "Outside 9 AM–5 PM",
                },
                {
                  text: { value: reading.time, color: Color.PrimaryText },
                  tooltip: dayOffset === 0 ? reading.date : `${reading.date} · ${dayDifference}`,
                },
                {
                  text: `00  ${reading.timeline}  24`,
                  tooltip: `${reading.time} on a 24-hour timeline`,
                },
              ]}
              actions={
                <TimeTravelActions
                  clipboardSummary={clipboardSummary}
                  selectedSummary={formatReadingSummary(reading)}
                  cityLabel={city.label}
                  onMove={move}
                  onNow={returnToNow}
                  onCitiesChange={updateCities}
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
