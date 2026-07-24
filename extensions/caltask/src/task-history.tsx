import {
  Action,
  ActionPanel,
  List,
  Icon,
  Color,
  showToast,
  Toast,
  popToRoot,
  LocalStorage,
  confirmAlert,
  Alert,
  AI,
  environment,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { getCurrentTask, startTask, stopCurrentTask, deleteTask, getCompletedTasks } from "./storage";
import {
  getCalendarEvents,
  exportOrUpdateCalendarEvent,
  exportToCalendar,
  deleteCalendarEvent,
  updateCalendarEventFull,
  createCalendarEvent,
  searchCalendarEvents,
  CALTASK_NOTES_MARKER,
} from "./calendar";
import { formatDuration, formatDateTime, formatRelativeDate, getElapsedTime } from "./utils";
import { Task, CalendarEvent, RecurringEventSpan } from "./types";
import StartTimer from "./start-timer";
import EventForm from "./event-form";
import { getPreferredAIModel, getUpcomingDays, getRecentHistoryDays, getVisibleCalendars } from "./preferences";

const EVENTS_CACHE_KEY = "calendar-events-cache";

// ── Search result helpers ───────────────────────────────────────

/** Format a date as "Monday, Feb 27, 2026" for section headers. */
function formatSectionDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Date key for grouping search results (YYYY-MM-DD). */
function searchDateKey(isoString: string): string {
  const d = new Date(isoString);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

/** Format time as "10:00" using 24-hour locale format. */
function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface CalendarEventsCache {
  cachedAt: string;
  upcoming: CalendarEvent[];
  recent: CalendarEvent[];
}

async function loadEventsCache(): Promise<CalendarEventsCache | null> {
  const raw = await LocalStorage.getItem<string>(EVENTS_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CalendarEventsCache;
  } catch {
    return null;
  }
}

async function saveEventsCache(upcoming: CalendarEvent[], recent: CalendarEvent[]): Promise<void> {
  const cache: CalendarEventsCache = {
    cachedAt: new Date().toISOString(),
    upcoming,
    recent,
  };
  await LocalStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(cache));
}

export default function TaskHistory() {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [recentEvents, setRecentEvents] = useState<CalendarEvent[]>([]);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Read preferences once per component mount (stable during session)
  const upcomingDaysDisplay = getUpcomingDays();
  const historyDaysDisplay = getRecentHistoryDays();

  // ── Search state ──────────────────────────────────────────────
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<CalendarEvent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const canUseAI = environment.canAccess(AI);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Search time range ─────────────────────────────────────────
  const [searchRange, setSearchRange] = useState("6m");

  /** Strip common time/date words from a search query for plain text matching. */
  function stripTimeWords(q: string): string {
    const timeWords = new Set([
      "today",
      "tomorrow",
      "yesterday",
      "this",
      "next",
      "last",
      "past",
      "previous",
      "week",
      "month",
      "year",
      "day",
      "days",
      "weeks",
      "months",
      "years",
      "morning",
      "afternoon",
      "evening",
      "tonight",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
      "january",
      "february",
      "march",
      "april",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
      "from",
      "to",
      "until",
      "since",
      "between",
      "on",
      "in",
      "at",
      "the",
      "of",
      "for",
      "ago",
    ]);
    const cleaned = q
      .split(/\s+/)
      .filter((w) => !timeWords.has(w.toLowerCase()))
      .join(" ")
      .trim();
    return cleaned || q;
  }

  /** Compute start/end dates from the search range dropdown value. */
  function getSearchDateRange(range: string): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (range) {
      case "1w": {
        // This week: Monday 00:00 to next Sunday 23:59
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        start.setDate(now.getDate() + diffToMonday);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case "1m":
        start.setMonth(now.getMonth() - 1);
        end.setMonth(now.getMonth() + 1);
        break;
      case "3m":
        start.setMonth(now.getMonth() - 3);
        end.setMonth(now.getMonth() + 3);
        break;
      case "6m":
        start.setMonth(now.getMonth() - 6);
        end.setMonth(now.getMonth() + 6);
        break;
      case "1y":
        start.setFullYear(now.getFullYear() - 1);
        end.setFullYear(now.getFullYear() + 1);
        break;
      case "all":
        start.setFullYear(now.getFullYear() - 5);
        end.setFullYear(now.getFullYear() + 5);
        break;
      default:
        start.setMonth(now.getMonth() - 6);
        end.setMonth(now.getMonth() + 6);
    }

    return { start, end };
  }

  async function getEnabledCalendarIds(): Promise<string[]> {
    const calendars = await getVisibleCalendars();
    return calendars.map((c) => c.id);
  }

  // ── AI search ─────────────────────────────────────────────────
  async function performAISearch(query: string) {
    try {
      const calendars = await getVisibleCalendars();
      const calendarNames = calendars.map((c) => c.name);

      // Get timezone offset string like "+11:00" or "-05:00"
      const tzOffset = (() => {
        const offset = new Date().getTimezoneOffset();
        const sign = offset <= 0 ? "+" : "-";
        const absOffset = Math.abs(offset);
        const hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
        const mins = String(absOffset % 60).padStart(2, "0");
        return `${sign}${hours}:${mins}`;
      })();
      const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const prompt = [
        "Parse this calendar search query into structured fields.",
        `Available calendars: ${JSON.stringify(calendarNames)}.`,
        `Today is ${new Date().toISOString()}.`,
        `User timezone: ${tzName} (UTC${tzOffset}).`,
        "Return ONLY valid JSON (no markdown, no explanation):",
        '- "keywords": string — ONLY event title/topic words.',
        "  Remove ALL time expressions.",
        '  "meeting this week" → "meeting".',
        '  "dentist tomorrow" → "dentist".',
        '  "events last friday" → "".',
        '- "calendarName": string | null — matched from available calendars.',
        '- "startDate": ISO 8601 string | null — inclusive start.',
        '- "endDate": ISO 8601 string | null — inclusive end.',
        `  IMPORTANT: Use the user's timezone (${tzOffset}) in dates,`,
        "  NOT UTC. endDate must be the last moment of the period.",
        "  Examples (assuming user timezone):",
        `  today → startDate: today 00:00:00${tzOffset},`,
        `  endDate: today 23:59:59${tzOffset}.`,
        `  this week → Mon 00:00:00${tzOffset} to Sun 23:59:59${tzOffset}.`,
        `  last year → Jan 1 00:00:00${tzOffset} to Dec 31 23:59:59${tzOffset}.`,
        "  If no time range mentioned, set both to null.",
        `Query: "${query}"`,
      ].join(" ");

      const response = await AI.ask(prompt, {
        model: getPreferredAIModel(),
        creativity: "none",
      });

      let jsonStr = response.trim();
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);
      // Safety: strip time words AI may leave in keywords
      const keywords: string = stripTimeWords(parsed.keywords || "");

      // Resolve calendar filter
      let calendarIds: string[] | undefined;
      if (parsed.calendarName) {
        const matched = calendars.find((c) => c.name.toLowerCase() === parsed.calendarName.toLowerCase());
        if (matched) {
          calendarIds = [matched.id];
        }
      }

      let start: Date;
      let end: Date;

      if (parsed.startDate && parsed.endDate) {
        start = new Date(parsed.startDate);
        end = new Date(parsed.endDate);
        // Fix boundary: if endDate is midnight (00:00:00) in
        // UTC or local, AI likely meant end of previous day.
        const isUTCMidnight = end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && end.getUTCSeconds() === 0;
        const isLocalMidnight = end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0;
        if (isUTCMidnight || isLocalMidnight) {
          end.setUTCSeconds(end.getUTCSeconds() - 1);
        }
      } else {
        const range = getSearchDateRange(searchRange);
        start = range.start;
        end = range.end;
      }

      const events = await searchCalendarEvents(keywords, start, end, calendarIds);
      setSearchResults(events);
    } catch {
      // AI failed → strip time words, use dropdown range
      const searchQuery = stripTimeWords(query);
      const { start, end } = getSearchDateRange(searchRange);
      const events = await searchCalendarEvents(searchQuery, start, end);
      setSearchResults(events);
    }
  }

  // ── Search effect with debounce ───────────────────────────────
  useEffect(() => {
    const query = searchText.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);

      if (canUseAI) {
        // AI search: parses natural language (time ranges,
        // calendar names, keywords)
        await performAISearch(query);
      } else {
        // Fallback: strip time words, use dropdown range
        const cleaned = stripTimeWords(query);
        const { start, end } = getSearchDateRange(searchRange);
        const results = await searchCalendarEvents(cleaned, start, end);
        setSearchResults(results);
      }

      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchText, searchRange]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Phase 1: Fast local data
      const [current, completed, cached] = await Promise.all([
        getCurrentTask(),
        getCompletedTasks(),
        loadEventsCache(),
      ]);
      if (cancelled) return;

      setCurrentTask(current);
      if (current && current.isRunning) {
        setElapsedTime(getElapsedTime(current.startTime));
      }
      setLocalTasks(completed.filter((t) => !t.exportedToCalendar));

      // Show cached events immediately (or empty if no cache)
      if (cached) {
        setUpcomingEvents(cached.upcoming);
        setRecentEvents(cached.recent);
      }
      setIsLoading(false);

      // Phase 2: Background refresh from EventKit
      const calendarIds = await getEnabledCalendarIds();
      if (cancelled) return;

      if (calendarIds.length > 0) {
        const upcomingDays = getUpcomingDays();
        const historyDays = getRecentHistoryDays();
        const now = new Date();
        const futureEnd = new Date();
        futureEnd.setDate(futureEnd.getDate() + upcomingDays);
        const pastStart = new Date();
        pastStart.setDate(pastStart.getDate() - historyDays);
        const [upcoming, recent] = await Promise.all([
          getCalendarEvents(calendarIds, now, futureEnd),
          getCalendarEvents(calendarIds, pastStart, now),
        ]);
        if (cancelled) return;

        const reversedRecent = [...recent].reverse();
        setUpcomingEvents(upcoming);
        setRecentEvents(reversedRecent);

        // Save to cache for next open
        await saveEventsCache(upcoming, reversedRecent);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (currentTask && currentTask.isRunning) {
      const interval = setInterval(() => {
        setElapsedTime(getElapsedTime(currentTask.startTime));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentTask]);

  async function reload() {
    setIsLoading(true);
    const current = await getCurrentTask();
    setCurrentTask(current);
    if (current && current.isRunning) {
      setElapsedTime(getElapsedTime(current.startTime));
    }

    const calendarIds = await getEnabledCalendarIds();

    if (calendarIds.length > 0) {
      const upcomingDays = getUpcomingDays();
      const historyDays = getRecentHistoryDays();
      const now = new Date();
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + upcomingDays);
      const pastStart = new Date();
      pastStart.setDate(pastStart.getDate() - historyDays);

      const [upcoming, recent] = await Promise.all([
        getCalendarEvents(calendarIds, now, futureEnd),
        getCalendarEvents(calendarIds, pastStart, now),
      ]);
      const reversedRecent = [...recent].reverse();
      setUpcomingEvents(upcoming);
      setRecentEvents(reversedRecent);
      await saveEventsCache(upcoming, reversedRecent);
    }
    const completed = await getCompletedTasks();
    setLocalTasks(completed.filter((t) => !t.exportedToCalendar));
    setIsLoading(false);
  }

  async function handleStop() {
    const stoppedTask = await stopCurrentTask();
    if (stoppedTask) {
      if (stoppedTask.calendarName || stoppedTask.sourceCalendarEventId) {
        const exported = await exportOrUpdateCalendarEvent(stoppedTask);
        if (exported) {
          await deleteTask(stoppedTask.id);
        }
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Timer Stopped",
        message: `"${stoppedTask.name}" - ${formatDuration(stoppedTask.duration || 0)}`,
      });
      await reload();
    }
  }

  async function handleStartFromEvent(event: CalendarEvent) {
    // Stop running task first
    if (currentTask && currentTask.isRunning) {
      const stoppedTask = await stopCurrentTask();
      if (stoppedTask && (stoppedTask.calendarName || stoppedTask.sourceCalendarEventId)) {
        const exported = await exportOrUpdateCalendarEvent(stoppedTask);
        if (exported) {
          await deleteTask(stoppedTask.id);
        }
      }
    }

    const newTask = await startTask(
      event.title,
      event.calendarId,
      event.calendarName,
      event.accountName,
      event.notes || undefined, // preserve original event notes
      undefined, // url
      event.id, // sourceCalendarEventId
    );
    await showToast({
      style: Toast.Style.Success,
      title: "Timer Started",
      message: `Started "${newTask.name}" → ${newTask.calendarName}`,
    });
    await popToRoot();
  }

  async function handleRestartFromEvent(event: CalendarEvent) {
    // Restart creates a NEW event (no sourceCalendarEventId)
    if (currentTask && currentTask.isRunning) {
      const stoppedTask = await stopCurrentTask();
      if (stoppedTask && (stoppedTask.calendarName || stoppedTask.sourceCalendarEventId)) {
        const exported = await exportOrUpdateCalendarEvent(stoppedTask);
        if (exported) {
          await deleteTask(stoppedTask.id);
        }
      }
    }

    const newTask = await startTask(event.title, event.calendarId, event.calendarName, event.accountName);
    await showToast({
      style: Toast.Style.Success,
      title: "Timer Started",
      message: `Started "${newTask.name}" → ${newTask.calendarName}`,
    });
    await popToRoot();
  }

  function isCalTaskEvent(event: CalendarEvent): boolean {
    return (event.notes ?? "").includes(CALTASK_NOTES_MARKER);
  }

  async function handleExportLocalTask(task: Task) {
    const exported = await exportToCalendar(task);
    if (exported) {
      await deleteTask(task.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Exported to Calendar",
        message: `"${task.name}" exported and removed from local`,
      });
    }
    await reload();
  }

  async function handleRestartLocalTask(task: Task) {
    if (currentTask && currentTask.isRunning) {
      const stoppedTask = await stopCurrentTask();
      if (stoppedTask && (stoppedTask.calendarName || stoppedTask.sourceCalendarEventId)) {
        const exported = await exportOrUpdateCalendarEvent(stoppedTask);
        if (exported) {
          await deleteTask(stoppedTask.id);
        }
      }
    }

    const newTask = await startTask(
      task.name,
      task.calendarId,
      task.calendarName,
      task.accountName,
      task.notes,
      task.url,
    );
    await showToast({
      style: Toast.Style.Success,
      title: "Timer Started",
      message: `Started "${newTask.name}"${newTask.calendarName ? ` → ${newTask.calendarName}` : ""}`,
    });
    await popToRoot();
  }

  async function handleDeleteEvent(event: CalendarEvent) {
    if (event.isRecurring) {
      const choice = await confirmAlert({
        title: "Delete Recurring Event",
        message: `Delete "${event.title}"?`,
        primaryAction: {
          title: "Only This Event",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: { title: "Cancel" },
      });
      if (choice) {
        // For recurring: ask for span
        const deleteAll = await confirmAlert({
          title: "Delete Scope",
          message: "Delete this and all future events, " + "or only this one?",
          primaryAction: {
            title: "This and Future",
            style: Alert.ActionStyle.Destructive,
          },
          dismissAction: { title: "Only This One" },
        });
        const span: RecurringEventSpan = deleteAll ? "future" : "this";
        const success = await deleteCalendarEvent(event.id, span, event.occurrenceDate);
        if (success) {
          await showToast({
            style: Toast.Style.Success,
            title: "Event Deleted",
          });
          await reload();
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to delete event",
          });
        }
      }
    } else {
      const confirmed = await confirmAlert({
        title: "Delete Event",
        message: `Are you sure you want to delete "${event.title}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (confirmed) {
        const success = await deleteCalendarEvent(event.id, "this", event.occurrenceDate);
        if (success) {
          await showToast({
            style: Toast.Style.Success,
            title: "Event Deleted",
          });
          await reload();
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to delete event",
          });
        }
      }
    }
  }

  return (
    <List
      isLoading={isLoading || isSearching}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={canUseAI ? 'Search events... (e.g. "meetings last week")' : "Search events..."}
      searchBarAccessory={
        <List.Dropdown tooltip="Search Range" value={searchRange} onChange={setSearchRange}>
          <List.Dropdown.Item title="This Week" value="1w" />
          <List.Dropdown.Item title="This Month" value="1m" />
          <List.Dropdown.Item title="3 Months" value="3m" />
          <List.Dropdown.Item title="6 Months" value="6m" />
          <List.Dropdown.Item title="1 Year" value="1y" />
          <List.Dropdown.Item title="All Time" value="all" />
        </List.Dropdown>
      }
    >
      {searchText.trim() ? (
        /* ── Search Results Mode ──────────────────────────── */
        <>
          {searchResults.length === 0 && !isSearching ? (
            <List.EmptyView icon={Icon.MagnifyingGlass} title="No events found" />
          ) : (
            (() => {
              const grouped = new Map<string, { label: string; events: CalendarEvent[] }>();
              for (const event of searchResults) {
                const key = searchDateKey(event.startDate);
                if (!grouped.has(key)) {
                  grouped.set(key, {
                    label: formatSectionDate(event.startDate),
                    events: [],
                  });
                }
                grouped.get(key)!.events.push(event);
              }
              for (const [, group] of grouped) {
                group.events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
              }
              const sorted = Array.from(grouped.entries()).sort(([a], [b]) => b.localeCompare(a));
              return (
                <>
                  {sorted.map(([key, { label, events }]) => (
                    <List.Section
                      key={key}
                      title={label}
                      subtitle={`${events.length} event${events.length === 1 ? "" : "s"}`}
                    >
                      {events.map((event) => {
                        const tintColor = event.calendarColor
                          ? {
                              light: event.calendarColor,
                              dark: event.calendarColor,
                              adjustContrast: false,
                            }
                          : Color.SecondaryText;
                        const timeStr = [formatTime(event.startDate), "\u2013", formatTime(event.endDate)].join(" ");
                        return (
                          <List.Item
                            key={`search-${event.id}-${event.startDate}`}
                            icon={{
                              source: Icon.Dot,
                              tintColor,
                            }}
                            title={event.title}
                            subtitle={event.calendarName}
                            accessories={[
                              { text: timeStr },
                              {
                                text: formatDuration(event.duration),
                              },
                            ]}
                            actions={
                              <ActionPanel>
                                <Action
                                  title="Start Timer"
                                  icon={Icon.Play}
                                  onAction={() => handleStartFromEvent(event)}
                                />
                                <Action.Push
                                  title="Edit Event"
                                  icon={Icon.Pencil}
                                  shortcut={{
                                    modifiers: ["cmd"],
                                    key: "e",
                                  }}
                                  target={
                                    <EventForm
                                      initialData={{
                                        title: event.title,
                                        calendarId: event.calendarId,
                                        startDate: new Date(event.startDate),
                                        endDate: new Date(event.endDate),
                                        isAllDay: event.isAllDay ?? false,
                                        notes: event.notes,
                                        url: event.url,
                                        location: event.location,
                                        recurrenceRule: "none",
                                      }}
                                      submitTitle="Save Changes"
                                      onSubmit={async (data) => {
                                        const success = await updateCalendarEventFull(
                                          event.id,
                                          data,
                                          "this",
                                          event.occurrenceDate,
                                        );
                                        if (success) {
                                          await showToast({
                                            style: Toast.Style.Success,
                                            title: "Event Updated",
                                          });
                                          await reload();
                                        }
                                      }}
                                    />
                                  }
                                />
                                <Action.Push
                                  title="New Event"
                                  icon={Icon.Plus}
                                  shortcut={{
                                    modifiers: ["cmd"],
                                    key: "n",
                                  }}
                                  target={
                                    <EventForm
                                      submitTitle="Create Event"
                                      onSubmit={async (data) => {
                                        const eventId = await createCalendarEvent(data);
                                        if (eventId) {
                                          await showToast({
                                            style: Toast.Style.Success,
                                            title: "Event Created",
                                          });
                                          await reload();
                                        }
                                      }}
                                    />
                                  }
                                />
                                <Action
                                  title="Refresh"
                                  icon={Icon.ArrowClockwise}
                                  shortcut={{
                                    modifiers: ["cmd"],
                                    key: "r",
                                  }}
                                  onAction={reload}
                                />
                                <Action
                                  title="Delete Event"
                                  icon={Icon.Trash}
                                  style={Action.Style.Destructive}
                                  shortcut={{
                                    modifiers: ["cmd"],
                                    key: "backspace",
                                  }}
                                  onAction={() => handleDeleteEvent(event)}
                                />
                              </ActionPanel>
                            }
                          />
                        );
                      })}
                    </List.Section>
                  ))}
                </>
              );
            })()
          )}
        </>
      ) : (
        /* ── Normal Mode ──────────────────────────────────── */
        <>
          {/* Currently Running */}
          {currentTask && currentTask.isRunning ? (
            <List.Section title="Currently Running">
              <List.Item
                icon={{
                  source: Icon.Clock,
                  tintColor: Color.Green,
                }}
                title={currentTask.name}
                subtitle={formatDuration(elapsedTime)}
                accessories={
                  [
                    currentTask.accountName ? { text: currentTask.accountName } : null,
                    currentTask.calendarName ? { tag: currentTask.calendarName } : null,
                    {
                      text: formatDateTime(currentTask.startTime),
                    },
                    {
                      icon: {
                        source: Icon.Play,
                        tintColor: Color.Green,
                      },
                      tooltip: "Running",
                    },
                  ].filter(Boolean) as List.Item.Accessory[]
                }
                actions={
                  <ActionPanel>
                    <Action
                      title={
                        currentTask.calendarName || currentTask.sourceCalendarEventId
                          ? "Stop & Export to Calendar"
                          : "Stop Timer"
                      }
                      icon={Icon.Stop}
                      onAction={handleStop}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          ) : (
            <List.Section title="Quick Actions">
              <List.Item
                icon={{
                  source: Icon.Play,
                  tintColor: Color.Blue,
                }}
                title="Start New Timer"
                subtitle="Begin tracking a new task"
                actions={
                  <ActionPanel>
                    <Action.Push title="Start Timer" icon={Icon.Play} target={<StartTimer />} />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}

          {/* Local Tasks (unexported) */}
          {localTasks.length > 0 && (
            <List.Section title="Local Tasks" subtitle={`${localTasks.length} unexported`}>
              {localTasks.map((task) => (
                <List.Item
                  key={`local-${task.id}`}
                  icon={{
                    source: Icon.Document,
                    tintColor: Color.Orange,
                  }}
                  title={task.name}
                  subtitle={formatDuration(task.duration || 0)}
                  accessories={
                    [
                      task.accountName ? { text: task.accountName } : null,
                      task.calendarName ? { tag: task.calendarName } : null,
                      {
                        text: formatDateTime(task.startTime),
                      },
                    ].filter(Boolean) as List.Item.Accessory[]
                  }
                  actions={
                    <ActionPanel>
                      <Action title="Start Timer" icon={Icon.Play} onAction={() => handleRestartLocalTask(task)} />
                      {task.calendarName && (
                        <Action
                          title="Export to Calendar"
                          icon={Icon.Calendar}
                          onAction={() => handleExportLocalTask(task)}
                        />
                      )}
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={reload}
                      />
                      <Action
                        title="Delete"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          await deleteTask(task.id);
                          await reload();
                        }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {/* Recent History */}
          <List.Section title="Recent History" subtitle={`${recentEvents.length} events`}>
            {recentEvents.length === 0 ? (
              <List.Item
                icon={Icon.Document}
                title="No recent events"
                subtitle={`No calendar events in the past ${historyDaysDisplay} days`}
              />
            ) : (
              recentEvents.map((event) => {
                const tintColor = event.calendarColor
                  ? {
                      light: event.calendarColor,
                      dark: event.calendarColor,
                      adjustContrast: false,
                    }
                  : Color.SecondaryText;
                return (
                  <List.Item
                    key={`recent-${event.id}-${event.startDate}`}
                    icon={{
                      source: isCalTaskEvent(event) ? Icon.Clock : Icon.Calendar,
                      tintColor,
                    }}
                    title={event.title}
                    subtitle={formatDuration(event.duration)}
                    accessories={
                      [
                        event.accountName ? { text: event.accountName } : null,
                        {
                          tag: {
                            value: event.calendarName,
                            color: tintColor,
                          },
                        },
                        {
                          text: formatDateTime(event.startDate),
                        },
                      ].filter(Boolean) as List.Item.Accessory[]
                    }
                    actions={
                      <ActionPanel>
                        <Action title="Start Timer" icon={Icon.Play} onAction={() => handleRestartFromEvent(event)} />
                        <Action.Push
                          title="Edit Event"
                          icon={Icon.Pencil}
                          shortcut={{
                            modifiers: ["cmd"],
                            key: "e",
                          }}
                          target={
                            <EventForm
                              initialData={{
                                title: event.title,
                                calendarId: event.calendarId,
                                startDate: new Date(event.startDate),
                                endDate: new Date(event.endDate),
                                isAllDay: event.isAllDay ?? false,
                                notes: event.notes,
                                url: event.url,
                                location: event.location,
                                recurrenceRule: "none",
                              }}
                              submitTitle="Save Changes"
                              onSubmit={async (data) => {
                                const success = await updateCalendarEventFull(
                                  event.id,
                                  data,
                                  "this",
                                  event.occurrenceDate,
                                );
                                if (success) {
                                  await showToast({
                                    style: Toast.Style.Success,
                                    title: "Event Updated",
                                  });
                                  await reload();
                                }
                              }}
                            />
                          }
                        />
                        <Action.Push
                          title="New Event"
                          icon={Icon.Plus}
                          shortcut={{
                            modifiers: ["cmd"],
                            key: "n",
                          }}
                          target={
                            <EventForm
                              submitTitle="Create Event"
                              onSubmit={async (data) => {
                                const eventId = await createCalendarEvent(data);
                                if (eventId) {
                                  await showToast({
                                    style: Toast.Style.Success,
                                    title: "Event Created",
                                  });
                                  await reload();
                                }
                              }}
                            />
                          }
                        />
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          shortcut={{
                            modifiers: ["cmd"],
                            key: "r",
                          }}
                          onAction={reload}
                        />
                        <Action
                          title="Delete Event"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{
                            modifiers: ["cmd"],
                            key: "backspace",
                          }}
                          onAction={() => handleDeleteEvent(event)}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })
            )}
          </List.Section>

          {/* Upcoming Events */}
          <List.Section
            title="Upcoming"
            subtitle={`Next ${upcomingDaysDisplay} days · ${upcomingEvents.length} events`}
          >
            {upcomingEvents.length === 0 ? (
              <List.Item
                icon={Icon.Calendar}
                title="No upcoming events"
                subtitle={`Next ${upcomingDaysDisplay} days are clear`}
              />
            ) : (
              upcomingEvents.map((event) => {
                const tintColor = event.calendarColor
                  ? {
                      light: event.calendarColor,
                      dark: event.calendarColor,
                      adjustContrast: false,
                    }
                  : Color.SecondaryText;
                return (
                  <List.Item
                    key={`upcoming-${event.id}-${event.startDate}`}
                    icon={{
                      source: isCalTaskEvent(event) ? Icon.Clock : Icon.Calendar,
                      tintColor,
                    }}
                    title={event.title}
                    subtitle={formatRelativeDate(event.startDate)}
                    accessories={
                      [
                        event.accountName ? { text: event.accountName } : null,
                        {
                          tag: {
                            value: event.calendarName,
                            color: tintColor,
                          },
                        },
                        {
                          text: formatDuration(event.duration),
                        },
                      ].filter(Boolean) as List.Item.Accessory[]
                    }
                    actions={
                      <ActionPanel>
                        <Action title="Start Timer" icon={Icon.Play} onAction={() => handleStartFromEvent(event)} />
                        <Action.Push
                          title="Edit Event"
                          icon={Icon.Pencil}
                          shortcut={{
                            modifiers: ["cmd"],
                            key: "e",
                          }}
                          target={
                            <EventForm
                              initialData={{
                                title: event.title,
                                calendarId: event.calendarId,
                                startDate: new Date(event.startDate),
                                endDate: new Date(event.endDate),
                                isAllDay: event.isAllDay ?? false,
                                notes: event.notes,
                                url: event.url,
                                location: event.location,
                                recurrenceRule: "none",
                              }}
                              submitTitle="Save Changes"
                              onSubmit={async (data) => {
                                const success = await updateCalendarEventFull(
                                  event.id,
                                  data,
                                  "this",
                                  event.occurrenceDate,
                                );
                                if (success) {
                                  await showToast({
                                    style: Toast.Style.Success,
                                    title: "Event Updated",
                                  });
                                  await reload();
                                }
                              }}
                            />
                          }
                        />
                        <Action.Push
                          title="New Event"
                          icon={Icon.Plus}
                          shortcut={{
                            modifiers: ["cmd"],
                            key: "n",
                          }}
                          target={
                            <EventForm
                              submitTitle="Create Event"
                              onSubmit={async (data) => {
                                const eventId = await createCalendarEvent(data);
                                if (eventId) {
                                  await showToast({
                                    style: Toast.Style.Success,
                                    title: "Event Created",
                                  });
                                  await reload();
                                }
                              }}
                            />
                          }
                        />
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          shortcut={{
                            modifiers: ["cmd"],
                            key: "r",
                          }}
                          onAction={reload}
                        />
                        <Action
                          title="Delete Event"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{
                            modifiers: ["cmd"],
                            key: "backspace",
                          }}
                          onAction={() => handleDeleteEvent(event)}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })
            )}
          </List.Section>
        </>
      )}
    </List>
  );
}
