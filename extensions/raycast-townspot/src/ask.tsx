import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  LocalStorage,
  getPreferenceValues,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  filterEventsByTimeWindow,
  formatEventTime,
  groupEventsByDay,
  relativeStartTag,
  TimeWindow,
} from "./lib/event-listing";
import { splitEventTags } from "./lib/event-tags";
import { askTownspot } from "./lib/townspot";
import { ActiveZoneOption, fetchActiveZones } from "./lib/zones";
import { RaycastResponse } from "./types";
import { CategoryPickerView } from "./views/category-picker-view";
import { EventDetailView } from "./views/event-detail-view";
import { TimeWindowPickerView } from "./views/time-window-picker-view";

type Preferences = {
  locale: string;
};

const DEFAULT_QUERY = "";
const FALLBACK_API_QUERY = "what's on this week";
const HOME_ZONE_STORAGE_KEY = "townspot-home-zone-id";
const NO_ZONE_VALUE = "__unset__";
const ZONE_VALUE_PREFIX = "zone:";
const SMALL_DOT = "·";
const API_EVENT_FETCH_LIMIT = 120;
const PROD_API_BASE_URL = "https://api.townspot.co/api";

const useDebouncedValue = <T,>(value: T, waitMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), waitMs);
    return () => clearTimeout(timeout);
  }, [value, waitMs]);

  return debounced;
};

const resolveEventUrl = (rawUrl: string): string => {
  const value = String(rawUrl || "").trim();
  if (!value) return "https://townspot.co";
  try {
    return new URL(value).toString();
  } catch {
    if (value.startsWith("/")) {
      return `https://townspot.co${value}`;
    }
    return `https://townspot.co/${value}`;
  }
};

const toZoneValue = (id: number): string => `${ZONE_VALUE_PREFIX}${id}`;

const parseZoneId = (value: string): number | null => {
  if (!value.startsWith(ZONE_VALUE_PREFIX)) return null;
  const id = Number(value.slice(ZONE_VALUE_PREFIX.length));
  if (!Number.isFinite(id)) return null;
  return id;
};

const toCategoriesLabel = (tags: string[]): string =>
  tags
    .filter(Boolean)
    .slice(0, 2)
    .join(" · ");

const cleanCategoryLabel = (value: string): string =>
  String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[·•\-–—\s]+|[·•\-–—\s]+$/g, "")
    .trim();

const isMeaningfulCategory = (value: string): boolean =>
  /[\p{L}\p{N}]/u.test(value);

const zoneActivityLabel = (zone: ActiveZoneOption): string => {
  if (Number.isFinite(zone.activeUsers)) {
    return `${zone.activeUsers} locals active`;
  }
  if (Number.isFinite(zone.weeklyEventsCount)) {
    return `${zone.weeklyEventsCount} locals active`;
  }
  return "";
};

const zoneDropdownTitle = (zone: ActiveZoneOption): string => {
  const activity = zoneActivityLabel(zone);
  return activity ? `${zone.name} ${SMALL_DOT} ${activity}` : zone.name;
};

const CATEGORY_ALL = "All";
const DEFAULT_TIME_WINDOW: TimeWindow = "today_tomorrow";

type TimeWindowOption = {
  id: TimeWindow;
  title: string;
};

const TIME_WINDOW_OPTIONS: TimeWindowOption[] = [
  { id: "now", title: "Happening now" },
  { id: "all_upcoming", title: "All Upcoming" },
  { id: "today", title: "Today" },
  {
    id: "today_tomorrow",
    title: "Today + Tomorrow",
  },
  { id: "next_3_days", title: "Next 3 Days" },
  { id: "next_7_days", title: "Next 7 Days" },
  { id: "this_week", title: "This Week" },
];

const normalizeCategory = (value: string): string =>
  value.trim().toLowerCase();

const timeWindowLabel = (value: TimeWindow): string =>
  TIME_WINDOW_OPTIONS.find((option) => option.id === value)?.title || "Today + Tomorrow";

const eventMatchesCategory = (tags: string[], selectedCategory: string): boolean => {
  if (selectedCategory === CATEGORY_ALL) return true;
  const normalizedSelected = normalizeCategory(selectedCategory);
  const normalizedTags = tags.map((tag) => normalizeCategory(tag));
  if (normalizedSelected === "kids") {
    return normalizedTags.includes("kids") || normalizedTags.includes("family");
  }
  return normalizedTags.includes(normalizedSelected);
};

const inferCategoryFromQuery = (value: string): string | null => {
  const query = normalizeWindowQuery(value);
  if (!query) return null;
  if (/\b(kids?|children|child|baby|babies|family|toddler|toddlers)\b/.test(query)) return "Kids";
  if (/\b(music|live|dj|concert|gig)\b/.test(query)) return "Music";
  if (/\b(food|eat|dinner|lunch|cafe|restaurant)\b/.test(query)) return "Food";
  if (/\b(comedy|stand\s?up|comic)\b/.test(query)) return "Comedy";
  if (/\b(art|gallery|museum|exhibit)\b/.test(query)) return "Art";
  return null;
};

const normalizeWindowQuery = (value: string): string =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const inferTimeWindowFromQuery = (value: string): TimeWindow | null => {
  const query = normalizeWindowQuery(value);
  if (!query) return null;
  if (
    query.includes("right now") ||
    query.includes("happening now") ||
    query.includes("on now") ||
    query.includes("live now") ||
    query === "now" ||
    query.startsWith("now ")
  ) {
    return "now";
  }
  if (query.includes("all upcoming")) return "all_upcoming";
  if (query.includes("tomorrow")) return "today_tomorrow";
  if (query.includes("this weekend")) return "next_3_days";
  if (query.includes("this week")) return "this_week";
  if (query.includes("next 7 days") || query.includes("next week")) return "next_7_days";
  if (query.includes("next 3 days")) return "next_3_days";
  if (query.includes("today")) return "today";
  if (query.includes("tonight")) return "today";
  return null;
};

const hasExplicitTimeIntent = (value: string): boolean => {
  const query = normalizeWindowQuery(value);
  if (!query) return false;
  return (
    query.includes("right now") ||
    query.includes("happening now") ||
    query.includes("on now") ||
    query.includes("live now") ||
    query === "now" ||
    query.startsWith("now ") ||
    query.includes("today") ||
    query.includes("tomorrow") ||
    query.includes("tonight") ||
    query.includes("this weekend") ||
    query.includes("this week") ||
    query.includes("next week") ||
    query.includes("next 3 days") ||
    query.includes("next 7 days") ||
    query.includes("all upcoming")
  );
};

const windowHintForApi = (timeWindow: TimeWindow): string => {
  if (timeWindow === "now") return "happening now";
  if (timeWindow === "today") return "today";
  if (timeWindow === "today_tomorrow") return "today and tomorrow";
  if (timeWindow === "next_3_days") return "next 3 days";
  if (timeWindow === "next_7_days") return "next 7 days";
  if (timeWindow === "this_week") return "this week";
  if (timeWindow === "all_upcoming") return "all upcoming";
  return "next 7 days";
};

export default function Command(
): JSX.Element {
  const preferences = getPreferenceValues<Preferences>();
  const initialQuery = DEFAULT_QUERY;

  const [zones, setZones] = useState<ActiveZoneOption[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState("");
  const [homeZoneLoading, setHomeZoneLoading] = useState(true);
  const [homeZoneId, setHomeZoneId] = useState<number | null>(null);
  const [selectedTownValue, setSelectedTownValue] = useState(NO_ZONE_VALUE);
  const [searchText, setSearchText] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RaycastResponse | null>(null);
  const [cachedResponsesByTown, setCachedResponsesByTown] = useState<Record<string, RaycastResponse>>({});
  const [hasLoadedTownData, setHasLoadedTownData] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORY_ALL);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<TimeWindow>(DEFAULT_TIME_WINDOW);
  const [manualCategoryQuery, setManualCategoryQuery] = useState("");
  const [manualTimeWindowQuery, setManualTimeWindowQuery] = useState("");

  const debouncedSearchText = useDebouncedValue(searchText, 200);
  const normalizedQuery = useMemo(
    () => normalizeWindowQuery(debouncedSearchText),
    [debouncedSearchText],
  );
  const queryForApi = useMemo(() => {
    const trimmed = debouncedSearchText.trim();
    const hint = windowHintForApi(selectedTimeWindow);
    if (!trimmed) {
      return `what's on ${hint}`;
    }
    if (hasExplicitTimeIntent(trimmed)) {
      return trimmed;
    }
    return `${trimmed} ${hint}`.trim();
  }, [debouncedSearchText, selectedTimeWindow]);

  useEffect(() => {
    const inferred = inferTimeWindowFromQuery(debouncedSearchText);
    if (manualTimeWindowQuery === normalizedQuery) return;
    if (!inferred || inferred === selectedTimeWindow) return;
    setSelectedTimeWindow(inferred);
  }, [debouncedSearchText, manualTimeWindowQuery, normalizedQuery, selectedTimeWindow]);

  useEffect(() => {
    const inferred = inferCategoryFromQuery(debouncedSearchText);
    if (manualCategoryQuery === normalizedQuery) return;
    if (!inferred || inferred === selectedCategory) return;
    setSelectedCategory(inferred);
  }, [debouncedSearchText, manualCategoryQuery, normalizedQuery, selectedCategory]);

  useEffect(() => {
    let cancelled = false;

    const loadHomeZone = async () => {
      setHomeZoneLoading(true);
      try {
        const stored = await LocalStorage.getItem<string>(HOME_ZONE_STORAGE_KEY);
        if (cancelled) return;
        const parsed = Number(stored || "");
        if (Number.isFinite(parsed)) {
          setHomeZoneId(parsed);
          setSelectedTownValue(toZoneValue(parsed));
        } else {
          setHomeZoneId(null);
        }
      } finally {
        if (!cancelled) {
          setHomeZoneLoading(false);
        }
      }
    };

    void loadHomeZone();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadZones = async () => {
      setZonesLoading(true);
      setZonesError("");
      try {
        const activeZones = await fetchActiveZones(
          PROD_API_BASE_URL,
        );
        if (cancelled) return;
        setZones(activeZones);
      } catch (error) {
        if (cancelled) return;
        setZones([]);
        setZonesError(
          error instanceof Error ? error.message : "Unable to load active towns",
        );
      } finally {
        if (!cancelled) {
          setZonesLoading(false);
        }
      }
    };

    void loadZones();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (homeZoneLoading || zonesLoading) return;

    const selectedZoneId = parseZoneId(selectedTownValue);
    if (selectedZoneId !== null) {
      const exists = zones.some((zone) => zone.id === selectedZoneId);
      if (!exists) {
        setSelectedTownValue(NO_ZONE_VALUE);
      }
      return;
    }

    if (homeZoneId !== null) {
      const storedHomeZone = zones.find((zone) => zone.id === homeZoneId);
      if (storedHomeZone) {
        setSelectedTownValue(toZoneValue(storedHomeZone.id));
        return;
      }
      setHomeZoneId(null);
      void LocalStorage.removeItem(HOME_ZONE_STORAGE_KEY);
    }
  }, [homeZoneLoading, zonesLoading, zones, selectedTownValue, homeZoneId]);

  const selectedZone = useMemo(
    () => {
      const selectedZoneId = parseZoneId(selectedTownValue) ?? homeZoneId;
      if (selectedZoneId === null) return undefined;
      return zones.find((zone) => zone.id === selectedZoneId);
    },
    [selectedTownValue, homeZoneId, zones],
  );

  const selectionHydrated = !homeZoneLoading && !zonesLoading;
  const needsHomeZone = selectionHydrated && !selectedZone;
  const effectiveTownSlug = selectedZone?.slug || "";

  useEffect(() => {
    if (!effectiveTownSlug) {
      if (selectionHydrated) {
        setResponse(null);
        setErrorMessage("");
      }
      setLoading(false);
      return;
    }

    let cancelled = false;
    const runQuery = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const result = await askTownspot({
          query: queryForApi,
          townSlug: effectiveTownSlug,
          locale: preferences.locale,
          apiBaseUrl: PROD_API_BASE_URL,
          limit: API_EVENT_FETCH_LIMIT,
          conversation: [],
        });
        if (cancelled) return;
        setResponse(result);
        if (result?.town?.slug) {
          setCachedResponsesByTown((previous) => ({
            ...previous,
            [result.town.slug]: result,
          }));
          setHasLoadedTownData((previous) => ({
            ...previous,
            [result.town.slug]: true,
          }));
        }
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to reach TownSpot",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void runQuery();

    return () => {
      cancelled = true;
    };
  }, [
    queryForApi,
    preferences.locale,
    effectiveTownSlug,
    selectionHydrated,
  ]);

  const responseForActiveTown =
    response?.town?.slug === effectiveTownSlug ? response : null;
  const cachedResponseForActiveTown = effectiveTownSlug ? cachedResponsesByTown[effectiveTownSlug] : null;
  const displayResponseForActiveTown = responseForActiveTown || cachedResponseForActiveTown || null;
  const activeTownName = selectedZone?.name || "Hometown";
  const activeThisWeek = selectedZone?.activeUsers ?? selectedZone?.weeklyEventsCount;
  const activeThisWeekLabel = Number.isFinite(activeThisWeek)
    ? `${activeThisWeek} locals active this week`
    : "locals active this week";
  const selectedZoneTitle = selectedZone ? zoneDropdownTitle(selectedZone) : "";
  const personalizedPlaceholder = `What's on in ${activeTownName}? Try kids, free, music, now...`;

  useEffect(() => {
    if (!selectionHydrated) {
      void updateCommandMetadata({ subtitle: "Loading hometown..." });
      return;
    }
    if (needsHomeZone || !selectedZone) {
      void updateCommandMetadata({ subtitle: "Set Hometown" });
      return;
    }
    const activityCount = Number.isFinite(activeThisWeek) ? String(activeThisWeek) : "0";
    void updateCommandMetadata({
      subtitle: `${selectedZone.name} ${SMALL_DOT} ${activityCount} local active this week`,
    });
  }, [selectionHydrated, needsHomeZone, selectedZone, activeThisWeek]);

  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    for (const event of displayResponseForActiveTown?.events || []) {
      const tagParts = splitEventTags(event.tags || []);
      for (const tag of tagParts.categories) {
        const value = cleanCategoryLabel(tag);
        if (!value || !isMeaningfulCategory(value)) continue;
        values.add(value);
      }
    }

    const sorted = Array.from(values).sort((a, b) => a.localeCompare(b));
    const hasKids = sorted.some((value) => normalizeCategory(value) === "kids");
    const hasFamily = sorted.some((value) => normalizeCategory(value) === "family");
    if (!hasKids && hasFamily) {
      sorted.unshift("Kids");
    }
    return [CATEGORY_ALL, ...sorted];
  }, [displayResponseForActiveTown]);

  const categoryFilteredEvents = useMemo(
    () =>
      (displayResponseForActiveTown?.events || []).filter((event) =>
        eventMatchesCategory(splitEventTags(event.tags || []).categories, selectedCategory),
      ),
    [displayResponseForActiveTown, selectedCategory],
  );

  useEffect(() => {
    if (categoryOptions.includes(selectedCategory)) return;
    setSelectedCategory(CATEGORY_ALL);
  }, [categoryOptions, selectedCategory]);

  const sectionTimezone = displayResponseForActiveTown?.town?.timezone || "Europe/London";
  const timeWindowEvents = useMemo(
    () =>
      filterEventsByTimeWindow(
        categoryFilteredEvents,
        sectionTimezone,
        selectedTimeWindow,
      ),
    [categoryFilteredEvents, sectionTimezone, selectedTimeWindow],
  );

  const daySections = useMemo(
    () => groupEventsByDay(timeWindowEvents, sectionTimezone),
    [timeWindowEvents, sectionTimezone],
  );
  const hasSeenTownData = Boolean(effectiveTownSlug && hasLoadedTownData[effectiveTownSlug]);
  const shouldShowLoadingResults = loading && !displayResponseForActiveTown;
  const shouldShowNoEvents =
    !loading &&
    !errorMessage &&
    !shouldShowLoadingResults &&
    (hasSeenTownData || Boolean(displayResponseForActiveTown)) &&
    daySections.length === 0;
  const categorySummaryText = useMemo(() => {
    const availableCount = categoryOptions.filter(
      (category) => category !== CATEGORY_ALL && isMeaningfulCategory(category),
    ).length;
    if (selectedCategory === CATEGORY_ALL) {
      return `${availableCount} categories`;
    }
    return selectedCategory;
  }, [categoryOptions, selectedCategory]);

  const setHomeZone = async (zone: ActiveZoneOption): Promise<void> => {
    setSelectedTownValue(toZoneValue(zone.id));
    setHomeZoneId(zone.id);
    await LocalStorage.setItem(HOME_ZONE_STORAGE_KEY, String(zone.id));
  };

  const onHomeZoneChange = async (value: string): Promise<void> => {
    if (value === NO_ZONE_VALUE) return;
    const zoneId = parseZoneId(value);
    if (zoneId === null) return;
    const zone = zones.find((item) => item.id === zoneId);
    if (!zone) return;
    await setHomeZone(zone);
  };

  const applyCategory = (category: string): void => {
    setManualCategoryQuery(normalizedQuery);
    setSelectedCategory(category);
  };

  const applyTimeWindow = (timeWindow: TimeWindow): void => {
    setManualTimeWindowQuery(normalizedQuery);
    setSelectedTimeWindow(timeWindow);
  };

  const cycleCategory = (direction: 1 | -1): void => {
    const ordered = categoryOptions;
    if (!ordered.length) return;
    const currentIndex = Math.max(0, ordered.indexOf(selectedCategory));
    const nextIndex =
      (currentIndex + direction + ordered.length) % ordered.length;
    applyCategory(ordered[nextIndex]);
  };

  const nextCategory = (): void => {
    cycleCategory(1);
  };

  const previousCategory = (): void => {
    cycleCategory(-1);
  };

  const cycleTimeWindow = (direction: 1 | -1): void => {
    const ordered = TIME_WINDOW_OPTIONS;
    if (!ordered.length) return;
    const currentIndex = Math.max(
      0,
      ordered.findIndex((option) => option.id === selectedTimeWindow),
    );
    const nextIndex = (currentIndex + direction + ordered.length) % ordered.length;
    applyTimeWindow(ordered[nextIndex].id);
  };

  const nextTimeWindow = (): void => {
    cycleTimeWindow(1);
  };

  const previousTimeWindow = (): void => {
    cycleTimeWindow(-1);
  };

  return (
    <List
      navigationTitle={needsHomeZone ? "TownSpot" : `${activeTownName} · ${activeThisWeekLabel}`}
      isLoading={loading || zonesLoading || homeZoneLoading}
      searchBarPlaceholder={
        !selectionHydrated
          ? "Loading your hometown..."
          : needsHomeZone
          ? "Set your hometown from the dropdown to start"
          : personalizedPlaceholder
      }
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Hometown"
          value={selectedTownValue}
          onChange={(value) => {
            void onHomeZoneChange(value);
          }}
        >
          <List.Dropdown.Item
            value={NO_ZONE_VALUE}
            title={
              !selectionHydrated
                ? "Loading Hometown..."
                : needsHomeZone
                  ? "Set hometown..."
                  : selectedZoneTitle || `${activeTownName} ${SMALL_DOT} ${activeThisWeekLabel}`
            }
            icon={Icon.Pin}
          />
          <List.Dropdown.Section title="Active Towns">
            {zones.map((zone) => (
              <List.Dropdown.Item
                key={zone.id}
                value={toZoneValue(zone.id)}
                title={zoneDropdownTitle(zone)}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      throttle
    >
      {!selectionHydrated ? null : needsHomeZone ? (
        <List.Section title="Setup">
          <List.Item
            title="Set your hometown to continue"
            subtitle="Open the hometown dropdown above and choose your town."
            icon={Icon.Pin}
            actions={
              <ActionPanel>
                {zones.map((zone) => (
                  <Action
                    key={zone.id}
                    title={`Set hometown: ${zone.name}`}
                    onAction={() => {
                      void setHomeZone(zone);
                    }}
                  />
                ))}
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        <>
          <List.Section title="Filters">
            <List.Item
              title="When"
              subtitle={`${timeWindowLabel(selectedTimeWindow)}. Press Enter, then use ↑/↓.`}
              icon={Icon.Clock}
              accessories={[{ text: `${timeWindowEvents.length} events` }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Choose Time Window"
                    target={
                      <TimeWindowPickerView
                        options={TIME_WINDOW_OPTIONS}
                        selectedTimeWindow={selectedTimeWindow}
                        onSelect={applyTimeWindow}
                      />
                    }
                  />
                  <Action
                    title="Next Time Window"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                    onAction={nextTimeWindow}
                  />
                  <Action
                    title="Previous Time Window"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                    onAction={previousTimeWindow}
                  />
                  {TIME_WINDOW_OPTIONS.map((option) => (
                    <Action
                      key={option.id}
                      title={`Show ${option.title}`}
                      onAction={() => applyTimeWindow(option.id)}
                    />
                  ))}
                </ActionPanel>
              }
            />
            <List.Item
              title="Categories"
              subtitle={
                selectedCategory === CATEGORY_ALL
                  ? "All categories. Press Enter, then use ↑/↓."
                  : `Selected: ${selectedCategory}. Press Enter, then use ↑/↓.`
              }
              icon={Icon.AppWindowGrid2x2}
              accessories={[{ text: categorySummaryText, icon: Icon.ChevronRight }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Choose Category"
                    target={
                      <CategoryPickerView
                        categories={categoryOptions}
                        selectedCategory={selectedCategory}
                        onSelect={applyCategory}
                      />
                    }
                  />
                  <Action
                    title="Next Category"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                    onAction={nextCategory}
                  />
                  <Action
                    title="Previous Category"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                    onAction={previousCategory}
                  />
                  <Action
                    title="Show All Categories"
                    onAction={() => applyCategory(CATEGORY_ALL)}
                  />
                  {categoryOptions
                    .filter((category) => category !== CATEGORY_ALL && isMeaningfulCategory(category))
                    .map((category) => (
                      <Action
                        key={category}
                        title={`Show ${category}`}
                        onAction={() => applyCategory(category)}
                      />
                    ))}
                </ActionPanel>
              }
            />
          </List.Section>

          {daySections.length ? (
            daySections.map((section) => (
              <List.Section key={section.id} title={section.title}>
                {section.events.map((event) => {
                  const resolvedEventUrl = resolveEventUrl(event.url);
                  const timeLabel = formatEventTime(event.startTime, sectionTimezone);
                  const liveTag = relativeStartTag(event);
                  const tagParts = splitEventTags(event.tags || []);
                  const accessories: List.Item.Accessory[] = [];
                  const statusLabel =
                    liveTag === "NOW"
                      ? "· NOW"
                      : liveTag
                        ? `· ${liveTag}`
                        : "";
                  const categoriesLabel = toCategoriesLabel(tagParts.categories);
                  const subtitle = [statusLabel, categoriesLabel].filter(Boolean).join(" · ");
                  accessories.push({
                    icon: Icon.Pin,
                    text: {
                      value: event.venueName || activeTownName,
                      color: Color.SecondaryText,
                    },
                  });
                  const title = [timeLabel, event.title].filter(Boolean).join("  ");

                  return (
                    <List.Item
                      key={event.id}
                      title={title}
                      subtitle={subtitle}
                      icon={{ source: "icon.png" }}
                      accessories={accessories}
                      actions={
                        <ActionPanel>
                          <ActionPanel.Section title="Event">
                            <Action.Push
                              title="View Event Details"
                              target={
                                <EventDetailView
                                  event={event}
                                  timezone={sectionTimezone}
                                  url={resolvedEventUrl}
                                  apiBaseUrl={PROD_API_BASE_URL}
                                />
                              }
                            />
                            <Action.OpenInBrowser
                              title="Open on Website"
                              url={resolvedEventUrl}
                            />
                            <Action.CopyToClipboard
                              title="Copy Event Link"
                              content={resolvedEventUrl}
                            />
                          </ActionPanel.Section>
                          <ActionPanel.Section title="Filters">
                            <Action
                              title="Show Events Happening Now"
                              onAction={() => applyTimeWindow("now")}
                            />
                            <Action
                              title="Next Category"
                              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                              onAction={nextCategory}
                            />
                            <Action
                              title="Previous Category"
                              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                              onAction={previousCategory}
                            />
                            <Action
                              title="Next Time Window"
                              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                              onAction={nextTimeWindow}
                            />
                            <Action
                              title="Previous Time Window"
                              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                              onAction={previousTimeWindow}
                            />
                            <Action
                              title="Show Today + Tomorrow"
                              onAction={() => applyTimeWindow("today_tomorrow")}
                            />
                            <Action
                              title="Show Kids Events"
                              onAction={() => applyCategory("Kids")}
                            />
                            <Action
                              title="Show All Categories"
                              onAction={() => applyCategory(CATEGORY_ALL)}
                            />
                          </ActionPanel.Section>
                        </ActionPanel>
                      }
                    />
                  );
                })}
              </List.Section>
            ))
          ) : shouldShowLoadingResults ? (
            <List.Section title="Today">
              <List.Item
                title="Loading events…"
                subtitle="Pulling the latest listings for your town."
                icon={Icon.Clock}
              />
            </List.Section>
          ) : shouldShowNoEvents ? (
            <List.Section title="Today">
              <List.Item
                title="No events for this search"
                subtitle="Try broadening your query or switch to another time window."
                icon={Icon.Calendar}
                actions={
                  <ActionPanel>
                    <Action
                      title="Show All Upcoming"
                      onAction={() => applyTimeWindow("all_upcoming")}
                    />
                    <Action
                      title="Search This Weekend"
                      onAction={() => setSearchText("what's on this weekend")}
                    />
                    <Action
                      title="Show Events Happening Now"
                      onAction={() => applyTimeWindow("now")}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          ) : null}
        </>
      )}

      {errorMessage ? (
        <List.Section title="Connection">
          <List.Item
            title="Unable to load TownSpot events"
            subtitle={errorMessage}
            icon={Icon.ExclamationMark}
          />
        </List.Section>
      ) : null}

      {zonesError ? (
        <List.Section title="Hometown">
          <List.Item
            title="Active towns unavailable"
            subtitle={zonesError}
            icon={Icon.ExclamationMark}
          />
        </List.Section>
      ) : null}
    </List>
  );
}
