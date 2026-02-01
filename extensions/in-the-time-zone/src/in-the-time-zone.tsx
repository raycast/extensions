import { Action, ActionPanel, Color, Icon, List, LocalStorage } from "@raycast/api";
import { DateTime } from "luxon";
import { useEffect, useMemo, useState } from "react";
import { searchCities } from "./citySearch";
import { TimelineView } from "./timeline-view";
import { DEFAULT_TIME_ZONES, getCityName, getTimezone } from "./timezones";

const STORAGE_KEY = "selectedTimeZones";
const BASE_CITY_KEY = "baseCityId";

function getNextHour(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return now.toISOString();
}

export default function Command() {
  const [baseISO, setBaseISO] = useState<string>(() => getNextHour());
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[] | null>(null);
  const [baseCityId, setBaseCityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "timeline">("timeline");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const load = async () => {
      const [stored, storedBase] = await Promise.all([
        LocalStorage.getItem<string>(STORAGE_KEY),
        LocalStorage.getItem<string>(BASE_CITY_KEY),
      ]);

      if (stored) {
        const parsed = stored.split("\n").filter(Boolean);
        setSelectedZoneIds(parsed.length > 0 ? parsed : DEFAULT_TIME_ZONES.map((zone) => zone.id));
      } else {
        setSelectedZoneIds(DEFAULT_TIME_ZONES.map((zone) => zone.id));
      }

      setBaseCityId(storedBase ?? null);
      setIsLoading(false);
    };
    void load();
  }, []);

  async function saveSelectedZones(nextIds: string[]) {
    const cleaned = nextIds.filter(Boolean);
    setSelectedZoneIds(cleaned);
    await LocalStorage.setItem(STORAGE_KEY, cleaned.join("\n"));

    // If the base city was removed, clear it
    if (baseCityId && !cleaned.includes(baseCityId)) {
      setBaseCityId(null);
      await LocalStorage.removeItem(BASE_CITY_KEY);
    }
  }

  async function addCityAndSetAsBase(cityId: string) {
    // Add to selected zones if not already there
    const currentIds = selectedZoneIds ?? [];
    if (!currentIds.includes(cityId)) {
      await saveSelectedZones([...currentIds, cityId]);
    }
    // Set as base
    setBaseCityId(cityId);
    await LocalStorage.setItem(BASE_CITY_KEY, cityId);
    setSearchText("");
  }

  async function setAsBase(cityId: string) {
    setBaseCityId(cityId);
    await LocalStorage.setItem(BASE_CITY_KEY, cityId);
  }

  async function clearBase() {
    setBaseCityId(null);
    await LocalStorage.removeItem(BASE_CITY_KEY);
  }

  async function removeCity(cityId: string) {
    const currentIds = selectedZoneIds ?? [];
    await saveSelectedZones(currentIds.filter((id) => id !== cityId));
  }

  // Use selected base city or fall back to system timezone
  const baseZoneId = baseCityId ? getTimezone(baseCityId) : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const base = useMemo(() => DateTime.fromISO(baseISO).setZone(baseZoneId), [baseISO, baseZoneId]);

  // Filter out the base city from the list (it's shown separately)
  const otherCities = useMemo(() => {
    const zoneIds = selectedZoneIds ?? [];
    return zoneIds.filter((id) => id !== baseCityId);
  }, [selectedZoneIds, baseCityId]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchText.trim()) return [];
    const currentIds = selectedZoneIds ?? [];
    return searchCities(searchText, 10).filter((city) => !currentIds.includes(city.id));
  }, [searchText, selectedZoneIds]);

  const rows = useMemo(() => {
    return otherCities.map((zoneId) => {
      const dt = DateTime.fromISO(baseISO).setZone(getTimezone(zoneId));
      const diffMinutes = dt.offset - base.offset;
      const cityName = getCityName(zoneId);
      const paddedTime = padTime(dt.toFormat("h:mm a"));
      return {
        key: zoneId,
        title: `${paddedTime}  ${cityName}`,
        subtitle: formatGmtOffset(dt.offset),
        deltaText: formatDelta(diffMinutes),
        deltaColor: getTimeColor(dt.hour),
        dateText: dt.toFormat("ccc, LLL d"),
      };
    });
  }, [baseISO, base.offset, otherCities]);

  const baseRow = useMemo(() => {
    const cityName = baseCityId ? getCityName(baseCityId) : getCityName(baseZoneId);
    const paddedTime = padTime(base.toFormat("h:mm a"));
    const isSystemTz = !baseCityId;
    return {
      title: `${paddedTime}  ${cityName}`,
      subtitle: `${formatGmtOffset(base.offset)}${isSystemTz ? " • System timezone" : ""}`,
      dateText: base.toFormat("ccc, LLL d"),
      timeColor: getTimeColor(base.hour),
      isSystemTz,
    };
  }, [base, baseZoneId, baseCityId]);

  function shiftMinutes(delta: number) {
    setBaseISO((prev) => DateTime.fromISO(prev).plus({ minutes: delta }).toISO() || prev);
  }

  // Render Timeline View when selected
  if (viewMode === "timeline") {
    return (
      <TimelineView
        baseISO={baseISO}
        baseCityId={baseCityId}
        selectedZoneIds={selectedZoneIds ?? []}
        onShiftMinutes={shiftMinutes}
        onSetBaseISO={setBaseISO}
        onToggleView={() => setViewMode("list")}
        onClearBase={clearBase}
      />
    );
  }

  return (
    <List
      navigationTitle="In The (Time) Zone"
      searchBarPlaceholder="Search cities to add..."
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {/* Search Results */}
      {searchResults.length > 0 && (
        <List.Section title="Search Results">
          {searchResults.map((city) => (
            <List.Item
              key={city.id}
              icon={Icon.Globe}
              title={city.label}
              subtitle={city.id}
              actions={
                <ActionPanel>
                  <Action title="Set as Base" icon={Icon.Pin} onAction={() => void addCityAndSetAsBase(city.id)} />
                  <Action
                    title="Timeline View"
                    icon={Icon.Calendar}
                    onAction={() => setViewMode("timeline")}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Base Time - only show when not searching */}
      {!searchText && (
        <List.Section title="Base Time">
          <List.Item
            icon={{ source: Icon.CircleFilled, tintColor: baseRow.timeColor }}
            title={baseRow.title}
            subtitle={baseRow.subtitle}
            accessories={[{ text: baseRow.dateText }]}
            actions={
              <ActionPanel>
                <Action
                  title="Timeline View"
                  icon={Icon.Calendar}
                  onAction={() => setViewMode("timeline")}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                />
                <Action
                  title="Reset to Now"
                  icon={Icon.Clock}
                  onAction={() => setBaseISO(getNextHour())}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                {!baseRow.isSystemTz && (
                  <Action
                    title="Use System Timezone"
                    icon={Icon.ComputerChip}
                    onAction={() => void clearBase()}
                    shortcut={{ modifiers: ["cmd"], key: "0" }}
                  />
                )}
                <ActionPanel.Section title="Scrub Time">
                  <Action
                    title="-1 Hour"
                    onAction={() => shiftMinutes(-60)}
                    shortcut={{ modifiers: [], key: "arrowLeft" }}
                  />
                  <Action
                    title="+1 Hour"
                    onAction={() => shiftMinutes(60)}
                    shortcut={{ modifiers: [], key: "arrowRight" }}
                  />
                  <Action
                    title="-30 Minutes"
                    onAction={() => shiftMinutes(-30)}
                    shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
                  />
                  <Action
                    title="+30 Minutes"
                    onAction={() => shiftMinutes(30)}
                    shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Base ISO"
                    content={base.toISO() ?? ""}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Cities - only show when not searching */}
      {!searchText && (
        <List.Section title="Cities">
          {rows.length > 0 ? (
            rows.map((row) => (
              <List.Item
                key={row.key}
                icon={{ source: Icon.Circle, tintColor: row.deltaColor }}
                title={row.title}
                subtitle={row.subtitle}
                accessories={[{ text: row.deltaText }, { text: row.dateText }]}
                actions={
                  <ActionPanel>
                    <Action title="Set as Base" icon={Icon.Pin} onAction={() => void setAsBase(row.key)} />
                    <Action
                      title="Remove City"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => void removeCity(row.key)}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    />
                    <Action
                      title="Reset to Now"
                      icon={Icon.Clock}
                      onAction={() => setBaseISO(getNextHour())}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                    <Action
                      title="Timeline View"
                      icon={Icon.Calendar}
                      onAction={() => setViewMode("timeline")}
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                    />
                    <ActionPanel.Section title="Scrub Time">
                      <Action
                        title="-1 Hour"
                        onAction={() => shiftMinutes(-60)}
                        shortcut={{ modifiers: [], key: "arrowLeft" }}
                      />
                      <Action
                        title="+1 Hour"
                        onAction={() => shiftMinutes(60)}
                        shortcut={{ modifiers: [], key: "arrowRight" }}
                      />
                      <Action
                        title="-30 Minutes"
                        onAction={() => shiftMinutes(-30)}
                        shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
                      />
                      <Action
                        title="+30 Minutes"
                        onAction={() => shiftMinutes(30)}
                        shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))
          ) : (
            <List.Item title="No cities yet" subtitle="Search for a city to add it" icon={Icon.Plus} />
          )}
        </List.Section>
      )}

      {/* Empty search results */}
      {searchText && searchResults.length === 0 && (
        <List.EmptyView
          title="No Results"
          description={`No cities found for "${searchText}"`}
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}

function formatGmtOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (minutes === 0) {
    return `GMT${sign}${hours}`;
  }
  return `GMT${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

function formatDelta(diffMinutes: number): string {
  if (diffMinutes === 0) return "same";
  const sign = diffMinutes > 0 ? "+" : "-";
  const abs = Math.abs(diffMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (minutes === 0) {
    return `${sign}${hours} hr${hours !== 1 ? "s" : ""}`;
  }
  return `${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

function padTime(time: string): string {
  return time.padStart(8, " ");
}

function getTimeColor(hour: number): Color {
  // Red: 12AM-7AM (sleeping hours)
  if (hour >= 0 && hour < 7) return Color.Red;
  // Green: 9AM-5PM (working hours)
  if (hour >= 9 && hour < 17) return Color.Green;
  // Yellow: 7AM-9AM and 5PM-12AM (marginal hours)
  return Color.Yellow;
}
