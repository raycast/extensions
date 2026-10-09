import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { DateTime } from "luxon";
import { useEffect, useMemo, useState } from "react";
import { searchCities } from "./citySearch";
import { getHourType } from "./palette";
import {
  ClockFormatPreference,
  formatDelta,
  formatGmtOffset,
  getCurrentMinuteISO,
  resolveTimeFormat,
  snapToGrid,
} from "./time-utils";
import { SnapTimeSection, TimelineView } from "./timeline-view";
import { CityOrderPreference, DEFAULT_TIME_ZONES, getCityName, getTimezone, sortZoneIds } from "./timezones";

const STORAGE_KEY = "selectedTimeZones";
const BASE_CITY_KEY = "baseCityId";

export default function Command() {
  const [nowISO, setNowISO] = useState<string>(getCurrentMinuteISO);
  // null while the cursor follows the current time; set once the user scrubs away from it
  const [cursorISO, setCursorISO] = useState<string | null>(null);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[] | null>(null);
  const [baseCityId, setBaseCityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "timeline">("timeline");
  const [searchText, setSearchText] = useState("");

  const preferences = getPreferenceValues<Preferences>();
  const scrubMinutes = parseInt(preferences.defaultScrubMinutes, 10) || 60;
  const optionScrubMinutes = parseInt(preferences.optionScrubMinutes, 10) || 30;
  const timeFormat = resolveTimeFormat(preferences.timeFormat as ClockFormatPreference);
  const cityOrder = (preferences.cityOrder as CityOrderPreference) ?? "offset-asc";

  useEffect(() => {
    const load = async () => {
      try {
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
      } catch (error) {
        setSelectedZoneIds(DEFAULT_TIME_ZONES.map((zone) => zone.id));
        setBaseCityId(null);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load saved timezones",
          message: error instanceof Error ? error.message : "Using defaults instead",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowISO(getCurrentMinuteISO()), 5000);
    return () => clearInterval(timer);
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

  async function moveCity(cityId: string, delta: -1 | 1) {
    const currentIds = [...(selectedZoneIds ?? [])];
    const from = currentIds.indexOf(cityId);
    if (from === -1) return;
    let to = from + delta;
    // Skip over the base city, which is displayed in its own section
    while (to >= 0 && to < currentIds.length && currentIds[to] === baseCityId) to += delta;
    if (to < 0 || to >= currentIds.length) return;
    currentIds.splice(from, 1);
    currentIds.splice(to, 0, cityId);
    await saveSelectedZones(currentIds);
  }

  // Use selected base city or fall back to system timezone
  const baseZoneId = baseCityId ? getTimezone(baseCityId) : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const baseISO = cursorISO ?? nowISO;
  const base = useMemo(() => DateTime.fromISO(baseISO).setZone(baseZoneId), [baseISO, baseZoneId]);

  // Apply the configured ordering (GMT offset or custom arrangement)
  const sortedZoneIds = useMemo(
    () => sortZoneIds(selectedZoneIds ?? [], baseISO, cityOrder),
    [selectedZoneIds, baseISO, cityOrder],
  );

  // Filter out the base city from the list (it's shown separately)
  const otherCities = useMemo(() => {
    return sortedZoneIds.filter((id) => id !== baseCityId);
  }, [sortedZoneIds, baseCityId]);

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
      const paddedTime = padTime(dt.toFormat(timeFormat));
      return {
        key: zoneId,
        title: `${paddedTime}  ${cityName}`,
        subtitle: formatGmtOffset(dt.offset),
        deltaText: formatDelta(diffMinutes, "clock"),
        deltaColor: getTimeColor(dt.hour),
        dateText: dt.toFormat("ccc, LLL d"),
      };
    });
  }, [baseISO, base.offset, otherCities, timeFormat]);

  const baseRow = useMemo(() => {
    const cityName = baseCityId ? getCityName(baseCityId) : getCityName(baseZoneId);
    const paddedTime = padTime(base.toFormat(timeFormat));
    const isSystemTz = !baseCityId;
    return {
      title: `${paddedTime}  ${cityName}`,
      subtitle: `${formatGmtOffset(base.offset)}${isSystemTz ? " • System timezone" : ""}`,
      dateText: base.toFormat("ccc, LLL d"),
      timeColor: getTimeColor(base.hour),
      isSystemTz,
    };
  }, [base, baseZoneId, baseCityId, timeFormat]);

  function shiftMinutes(delta: number) {
    setCursorISO((prev) => {
      const cursor = DateTime.fromISO(prev ?? nowISO);
      return cursor.plus({ minutes: delta }).toISO() || prev;
    });
  }

  function snapMinutes(stepMinutes: number, direction: 1 | -1) {
    setCursorISO((prev) => {
      const cursor = DateTime.fromISO(prev ?? nowISO).setZone(baseZoneId);
      return snapToGrid(cursor, stepMinutes, direction).toISO() || prev;
    });
  }

  function resetToNow() {
    setCursorISO(null);
    setNowISO(getCurrentMinuteISO());
  }

  function formatScrubTitle(minutes: number): string {
    const sign = minutes >= 0 ? "+" : "-";
    const abs = Math.abs(minutes);
    if (abs === 60) return `${sign}1 Hour`;
    return `${sign}${abs} Minutes`;
  }

  // Render Timeline View when selected
  if (viewMode === "timeline") {
    return (
      <TimelineView
        baseISO={baseISO}
        nowISO={nowISO}
        baseCityId={baseCityId}
        selectedZoneIds={sortedZoneIds}
        isLoading={isLoading}
        onShiftMinutes={shiftMinutes}
        onSnapMinutes={snapMinutes}
        onResetToNow={resetToNow}
        onToggleView={() => setViewMode("list")}
        onClearBase={clearBase}
        scrubMinutes={scrubMinutes}
        optionScrubMinutes={optionScrubMinutes}
        timeFormat={timeFormat}
      />
    );
  }

  return (
    <List
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
                  onAction={resetToNow}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
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
                    title={formatScrubTitle(-scrubMinutes)}
                    onAction={() => shiftMinutes(-scrubMinutes)}
                    shortcut={{ modifiers: [], key: "arrowLeft" }}
                  />
                  <Action
                    title={formatScrubTitle(scrubMinutes)}
                    onAction={() => shiftMinutes(scrubMinutes)}
                    shortcut={{ modifiers: [], key: "arrowRight" }}
                  />
                  <Action
                    title={formatScrubTitle(-optionScrubMinutes)}
                    onAction={() => shiftMinutes(-optionScrubMinutes)}
                    shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
                  />
                  <Action
                    title={formatScrubTitle(optionScrubMinutes)}
                    onAction={() => shiftMinutes(optionScrubMinutes)}
                    shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
                  />
                </ActionPanel.Section>
                <SnapTimeSection
                  scrubMinutes={scrubMinutes}
                  optionScrubMinutes={optionScrubMinutes}
                  onSnapMinutes={snapMinutes}
                />
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Base ISO"
                    content={base.toISO() ?? ""}
                    shortcut={Keyboard.Shortcut.Common.Copy}
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
                      onAction={resetToNow}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                    />
                    <Action
                      title="Timeline View"
                      icon={Icon.Calendar}
                      onAction={() => setViewMode("timeline")}
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                    />
                    {cityOrder === "custom" && (
                      <ActionPanel.Section title="Arrange">
                        <Action
                          title="Move up"
                          icon={Icon.ArrowUp}
                          onAction={() => void moveCity(row.key, -1)}
                          shortcut={Keyboard.Shortcut.Common.MoveUp}
                        />
                        <Action
                          title="Move Down"
                          icon={Icon.ArrowDown}
                          onAction={() => void moveCity(row.key, 1)}
                          shortcut={Keyboard.Shortcut.Common.MoveDown}
                        />
                      </ActionPanel.Section>
                    )}
                    <ActionPanel.Section title="Scrub Time">
                      <Action
                        title={formatScrubTitle(-scrubMinutes)}
                        onAction={() => shiftMinutes(-scrubMinutes)}
                        shortcut={{ modifiers: [], key: "arrowLeft" }}
                      />
                      <Action
                        title={formatScrubTitle(scrubMinutes)}
                        onAction={() => shiftMinutes(scrubMinutes)}
                        shortcut={{ modifiers: [], key: "arrowRight" }}
                      />
                      <Action
                        title={formatScrubTitle(-optionScrubMinutes)}
                        onAction={() => shiftMinutes(-optionScrubMinutes)}
                        shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
                      />
                      <Action
                        title={formatScrubTitle(optionScrubMinutes)}
                        onAction={() => shiftMinutes(optionScrubMinutes)}
                        shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
                      />
                    </ActionPanel.Section>
                    <SnapTimeSection
                      scrubMinutes={scrubMinutes}
                      optionScrubMinutes={optionScrubMinutes}
                      onSnapMinutes={snapMinutes}
                    />
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

function padTime(time: string): string {
  return time.padStart(8, " ");
}

function getTimeColor(hour: number): Color {
  const type = getHourType(hour);
  if (type === "sleep") return Color.Blue;
  if (type === "work") return Color.Yellow;
  return Color.Orange;
}
