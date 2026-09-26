import { withAccessToken } from "@raycast/utils";
import { googleOAuth } from "./lib/google-oauth";
import {
  menuBarSessionRevision,
  subscribeMenuBarSession,
} from "./lib/menu-bar-session";
import { transferModeFor } from "./event-actions";
import {
  Cache,
  Color,
  Icon,
  LaunchType,
  LaunchProps,
  MenuBarExtra,
  environment,
  getPreferenceValues,
  launchCommand,
  open,
  showHUD,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarSelectionMode,
  getMenuBarEnabledCalendarIds,
  isCalendarSetupComplete,
} from "./lib/calendar-settings";
import {
  DEFAULT_MENU_BAR_DISPLAY_SETTINGS,
  MenuBarDateStyle,
  MenuBarDisplaySettings,
  MenuBarRowLayout,
  normaliseMenuBarDisplaySettings,
  readMenuBarDisplaySettings,
  updateMenuBarDisplaySettings,
} from "./lib/menu-bar-display-settings";
import {
  calendarDisplayColor,
  conferenceUrl,
  connectedGoogleCalendarViewUrl,
  eventEndMillis,
  eventStartMillis,
  isAllDay,
  loadSchedule,
  timeLabel,
} from "./lib/schedule";
import { currentGoogleConnectionFingerprint, isWritable } from "./lib/google";
import { GoogleCalendarEntry, GoogleEvent, ScheduleEvent } from "./lib/types";

type MenuBarMode =
  "never" | "2" | "5" | "10" | "15" | "30" | "60" | "upcoming" | "always";

type MenuBarHeadlineStyle = "smart" | "event-only";

interface Preferences {
  hideDeclined: boolean;
  calendarSelectionMode: CalendarSelectionMode;
  menuBarMode: MenuBarMode;
  menuBarHeadlineStyle: MenuBarHeadlineStyle;
}

const MENU_BAR_CACHE_KEY_PREFIX = "schedule-snapshot-v3";
const MENU_BAR_CACHE_STALE_MS = 3 * 60_000;

function menuBarCacheKey(): string {
  try {
    return `${MENU_BAR_CACHE_KEY_PREFIX}:${currentGoogleConnectionFingerprint()}`;
  } catch {
    return `${MENU_BAR_CACHE_KEY_PREFIX}:unconfigured`;
  }
}
const menuBarCache = new Cache({ namespace: "calendar-shortcuts-menu-bar" });

type MenuBarLaunchContext = {
  refreshMode?: "display" | "full";
  sessionRevision?: string;
  displaySettings?: MenuBarDisplaySettings;
};

type MenuBarSnapshot = {
  updatedAt: number;
  setupComplete: boolean | null;
  events: ScheduleEvent[];
};

function readMenuBarSnapshot(): MenuBarSnapshot | null {
  try {
    const raw = menuBarCache.get(menuBarCacheKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MenuBarSnapshot;
    if (!Array.isArray(parsed.events) || typeof parsed.updatedAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeMenuBarSnapshot(snapshot: MenuBarSnapshot): void {
  menuBarCache.set(menuBarCacheKey(), JSON.stringify(snapshot));
}

function mapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function eventTitle(item: ScheduleEvent): string {
  return item.event.summary?.trim() || "Untitled Event";
}

function truncate(value: string, max = 24): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function allDaySpansLocalDay(item: ScheduleEvent, day: Date): boolean {
  if (!isAllDay(item)) return false;

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);

  const nextDay = new Date(dayStart);
  nextDay.setDate(nextDay.getDate() + 1);

  // Google all-day end dates are exclusive.
  return (
    eventStartMillis(item) < nextDay.getTime() &&
    eventEndMillis(item) > dayStart.getTime()
  );
}

function clockLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toLowerCase()
    .replace(" ", "");
}

function minutesBetween(laterMs: number, earlierMs: number): number {
  return Math.max(0, Math.ceil((laterMs - earlierMs) / 60_000));
}

function compactDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function eventOnlyHeadlineTitle(
  item: ScheduleEvent | undefined,
): string | undefined {
  return item ? truncate(eventTitle(item)) : undefined;
}

function smartHeadlineTitle(
  item: ScheduleEvent | undefined,
  now: Date,
  mode: MenuBarMode,
  onlyMeetings: boolean,
  dateStyle: MenuBarDateStyle,
): string | undefined {
  if (!item) {
    return mode === "always"
      ? onlyMeetings
        ? "Nothing else shown today"
        : "Nothing else shown today"
      : undefined;
  }

  if (isAllDay(item)) {
    const start = new Date(eventStartMillis(item));
    return allDaySpansLocalDay(item, now)
      ? `${truncate(eventTitle(item))} · All day`
      : `${truncate(eventTitle(item))} · ${compactDateLabel(start, dateStyle)} · All day`;
  }

  const nowMs = now.getTime();
  const startMs = eventStartMillis(item);
  const endMs = eventEndMillis(item);
  const start = new Date(startMs);

  if (startMs <= nowMs && nowMs < endMs) {
    if (nowMs - startMs < 60_000) {
      return `${truncate(eventTitle(item))} · Now`;
    }

    const minutesLeft = minutesBetween(endMs, nowMs);
    return `${truncate(eventTitle(item))} · ${compactDuration(minutesLeft)} left`;
  }

  if (startMs > nowMs) {
    if (!sameLocalDay(start, now)) {
      return onlyMeetings
        ? "Nothing else shown today"
        : "Nothing else shown today";
    }

    const minutesUntil = minutesBetween(startMs, nowMs);

    // Threshold modes already hide the menu-bar item until the event is close,
    // so a concise "Next event/meeting at…" status is most useful in Upcoming / Always modes.
    if ((mode === "upcoming" || mode === "always") && minutesUntil > 60) {
      return onlyMeetings
        ? `Next meeting at ${clockLabel(start)}`
        : `Next event at ${clockLabel(start)}`;
    }

    return `${truncate(eventTitle(item))} · in ${compactDuration(minutesUntil)}`;
  }

  return `${truncate(eventTitle(item))} · ${clockLabel(start)}`;
}

const THREE_LETTER_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function compactDateLabel(date: Date, style: MenuBarDateStyle): string {
  const weekday = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
  }).format(date);
  const month = THREE_LETTER_MONTHS[date.getMonth()];
  const day = date.getDate();

  return style === "month-day"
    ? `${weekday} ${month} ${day}`
    : `${weekday} ${day} ${month}`;
}

function menuRowDate(
  item: ScheduleEvent,
  now: Date,
  dateStyle: MenuBarDateStyle,
): string | undefined {
  const start = new Date(eventStartMillis(item));
  return sameLocalDay(start, now) || allDaySpansLocalDay(item, now)
    ? undefined
    : compactDateLabel(start, dateStyle);
}

function shorterMenuRowDate(
  item: ScheduleEvent,
  now: Date,
  dateStyle: MenuBarDateStyle,
): string | undefined {
  const start = new Date(eventStartMillis(item));
  if (sameLocalDay(start, now) || allDaySpansLocalDay(item, now)) {
    return undefined;
  }

  const month = THREE_LETTER_MONTHS[start.getMonth()];
  const day = start.getDate();
  return dateStyle === "month-day" ? `${month} ${day}` : `${day} ${month}`;
}

function menuRowTime(item: ScheduleEvent, now: Date): string {
  if (isAllDay(item)) return "All day";

  const nowMs = now.getTime();
  if (isCurrentTimedEvent(item, nowMs)) {
    const end = new Date(eventEndMillis(item));
    return `Now · until ${clockLabel(end)}`;
  }

  return timeLabel(item);
}

function timeParts(date: Date): { clock: string; period: "am" | "pm" } {
  const hours24 = date.getHours();
  const period = hours24 >= 12 ? "pm" : "am";
  const hours12 = hours24 % 12 || 12;
  const minutes = date.getMinutes();
  return {
    clock:
      minutes === 0
        ? `${hours12}`
        : `${hours12}:${String(minutes).padStart(2, "0")}`,
    period,
  };
}

function shorterMenuRowTime(item: ScheduleEvent, now: Date): string {
  if (isAllDay(item)) return "All day";

  const nowMs = now.getTime();
  if (isCurrentTimedEvent(item, nowMs)) {
    const end = new Date(eventEndMillis(item));
    return `Now · ${clockLabel(end)}`;
  }

  const start = new Date(eventStartMillis(item));
  const end = new Date(eventEndMillis(item));
  const startTime = timeParts(start);
  const endTime = timeParts(end);

  if (startTime.period === endTime.period) {
    return `${startTime.clock}–${endTime.clock}${endTime.period}`;
  }

  return `${startTime.clock}${startTime.period}–${endTime.clock}${endTime.period}`;
}

const MENU_ROW_COMPACT_THRESHOLD = 64;

function joinMenuRowParts(
  order: Array<"date" | "time" | "title">,
  parts: { date?: string; time: string; title: string },
): string {
  return order
    .map((key) => parts[key])
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}

function menuRowTitle(
  item: ScheduleEvent,
  now: Date,
  layout: MenuBarRowLayout,
  dateStyle: MenuBarDateStyle,
): string {
  const order = layout.split("-") as Array<"date" | "time" | "title">;
  const title = eventTitle(item);

  const fullParts = {
    date: menuRowDate(item, now, dateStyle),
    time: menuRowTime(item, now),
    title,
  };
  const full = joinMenuRowParts(order, fullParts);
  if (full.length <= MENU_ROW_COMPACT_THRESHOLD) return full;

  // Protect the user's event title. When a row is getting long, compress the
  // metadata first so Raycast has less reason to truncate the meaningful bit.
  // First collapse duplicate am/pm markers (4pm–6pm -> 4–6pm).
  const shorterTimeParts = {
    ...fullParts,
    time: shorterMenuRowTime(item, now),
  };
  const shorterTime = joinMenuRowParts(order, shorterTimeParts);
  if (shorterTime.length <= MENU_ROW_COMPACT_THRESHOLD) return shorterTime;

  // If it is still long, drop the weekday but keep an unambiguous month/day
  // using the user's selected UK/US ordering.
  const compactParts = {
    ...shorterTimeParts,
    date: shorterMenuRowDate(item, now, dateStyle),
  };

  const metadataValues = order
    .filter((key) => key !== "title")
    .map((key) => compactParts[key])
    .filter((value): value is string => Boolean(value));

  const separatorLength = metadataValues.length * 3; // " · "
  const metadataLength = metadataValues.reduce(
    (total, value) => total + value.length,
    0,
  );

  const maxTitleLength = Math.max(
    12,
    MENU_ROW_COMPACT_THRESHOLD - metadataLength - separatorLength,
  );

  return joinMenuRowParts(order, {
    ...compactParts,
    title: truncate(title, maxTitleLength),
  });
}

function isCurrentTimedEvent(item: ScheduleEvent, nowMs: number): boolean {
  if (isAllDay(item)) return false;
  return eventStartMillis(item) <= nowMs && nowMs < eventEndMillis(item);
}

function isUpcomingEvent(item: ScheduleEvent, nowMs: number): boolean {
  return eventEndMillis(item) > nowMs;
}

function headlineForMode(
  mode: MenuBarMode,
  candidates: ScheduleEvent[],
  now: Date,
): { visible: boolean; item?: ScheduleEvent } {
  if (mode === "never") return { visible: false };

  const nowMs = now.getTime();
  const current = candidates.find((item) => isCurrentTimedEvent(item, nowMs));
  const nextTimed = candidates.find(
    (item) => !isAllDay(item) && eventStartMillis(item) > nowMs,
  );
  const nextAny = candidates.find((item) => isUpcomingEvent(item, nowMs));

  // For Always / Upcoming-style headline selection, respect the actual
  // chronological order of events. All-day events are real upcoming events
  // and should not be skipped just because a later event has a start time.
  // A timed event that is happening right now still takes priority.
  const headline = current || nextAny;

  if (mode === "always") return { visible: true, item: headline };

  if (mode === "upcoming") {
    // Keep DayCal available as a compact calendar icon on days
    // with no remaining event. Only put event text in the macOS menu bar when
    // there is a current or upcoming event today; future days stay in the
    // dropdown without turning the headline into "Nothing else shown today".
    const todayHeadline = candidates.find((item) => {
      if (!isUpcomingEvent(item, nowMs)) return false;
      if (allDaySpansLocalDay(item, now)) return true;
      const start = new Date(eventStartMillis(item));
      return sameLocalDay(start, now);
    });

    return { visible: true, item: current || todayHeadline };
  }

  const minutes = Number(mode);
  if (!Number.isFinite(minutes)) return { visible: false };
  if (current) return { visible: true, item: current };
  if (!nextTimed) return { visible: false };

  const untilStart = eventStartMillis(nextTimed) - nowMs;
  return {
    visible: untilStart >= 0 && untilStart <= minutes * 60_000,
    item: nextTimed,
  };
}

function calendarDayUrl(item: ScheduleEvent): string {
  const start = item.event.start.dateTime
    ? new Date(item.event.start.dateTime)
    : item.event.start.date
      ? new Date(`${item.event.start.date}T00:00:00`)
      : null;

  if (!start) {
    return "https://calendar.google.com/calendar/u/0/r";
  }

  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");

  return `https://calendar.google.com/calendar/u/0/r/day/${year}/${month}/${day}`;
}

async function openCalendarInBrowser(): Promise<void> {
  try {
    await open(await connectedGoogleCalendarViewUrl());
  } catch (error) {
    await showHUD(
      error instanceof Error ? error.message : "Could not open Google Calendar",
    );
  }
}

function calendarEventBrowserUrl(item: ScheduleEvent): string {
  return item.event.htmlLink?.trim() || calendarDayUrl(item);
}

function canModifyEvent(
  calendar: GoogleCalendarEntry,
  event: GoogleEvent,
): boolean {
  if (!isWritable(calendar) || event.eventType === "birthday") return false;

  // A writable calendar does not mean every event on it is ours to modify.
  // Invited events can live on the primary calendar while another person is
  // still the organiser. Be conservative: if Google explicitly says someone
  // else organised it, or this account appears only as an attendee, treat it
  // as guest/read-only for shared event fields.
  if (event.organizer?.self === false) return false;
  if (event.organizer?.self === true || event.creator?.self === true)
    return true;

  const selfAttendee = event.attendees?.some((attendee) => attendee.self);
  if (selfAttendee) return false;

  // Older/partial responses may omit organiser metadata for ordinary events.
  // Preserve existing behaviour only when there is no evidence this is an invite.
  return true;
}

function isGmailGeneratedEvent(event: GoogleEvent): boolean {
  if (event.eventType === "fromGmail") return true;

  // A copied Gmail event becomes a normal/default Google Calendar event but can
  // retain the original Gmail boilerplate in its description. If Google has
  // explicitly told us the event type, trust that instead of the description
  // so editable copies are not mistaken for locked Gmail-generated events.
  if (event.eventType) return false;

  // Fallback for older/partial API responses that omit eventType.
  const description = event.description?.toLowerCase() || "";
  return (
    description.includes("event was created from an email") ||
    description.includes("automatically created events")
  );
}

async function launchEventAction(
  item: ScheduleEvent,
  action: "view" | "edit" | "copy" | "move" | "delete",
  hideCopyToCalendar = false,
): Promise<void> {
  try {
    await launchCommand({
      name: "schedule",
      type: LaunchType.UserInitiated,
      context: {
        calendar: item.calendar,
        event: item.event,
        action,
        hideCopyToCalendar,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const timedOut =
      /timed out|IpcRequestTimeoutError|openRaycastCommand/i.test(message);

    if (action === "delete") {
      await showHUD(
        timedOut
          ? "Couldn’t open delete confirmation — try again"
          : "Couldn’t open delete confirmation",
      );
      return;
    }

    if (action === "edit") {
      await showHUD(
        timedOut
          ? "Couldn’t open event editor — try again"
          : "Couldn’t open event editor",
      );
      return;
    }

    if (action === "copy" || action === "move") {
      await showHUD(
        timedOut
          ? "Couldn’t open calendar picker — try again"
          : "Couldn’t open calendar picker",
      );
      return;
    }

    await showHUD(
      timedOut
        ? "Couldn’t open event actions — try again"
        : "Couldn’t open event actions",
    );
  }
}

function Command(props: LaunchProps<{ launchContext?: MenuBarLaunchContext }>) {
  const sessionRevision = useRef(menuBarSessionRevision()).current;
  const sessionIsCurrent = useCallback(
    () => menuBarSessionRevision() === sessionRevision,
    [sessionRevision],
  );
  const preferences = getPreferenceValues<Preferences>();
  const displayOnlyRefresh =
    environment.launchType === LaunchType.Background &&
    props.launchContext?.refreshMode === "display";
  const initialSnapshot = readMenuBarSnapshot();
  const initialDisplaySettings = normaliseMenuBarDisplaySettings(
    props.launchContext?.displaySettings ?? DEFAULT_MENU_BAR_DISPLAY_SETTINGS,
  );
  const initialSnapshotIsStale =
    !initialSnapshot ||
    Date.now() - initialSnapshot.updatedAt > MENU_BAR_CACHE_STALE_MS;

  const [isLoading, setIsLoading] = useState(
    preferences.menuBarMode !== "never" &&
      (displayOnlyRefresh ||
        environment.launchType === LaunchType.Background ||
        initialSnapshotIsStale),
  );
  const [setupComplete, setSetupComplete] = useState<boolean | null>(
    initialSnapshot?.setupComplete ?? null,
  );
  const setupRedirectStartedRef = useRef(false);
  const [events, setEvents] = useState<ScheduleEvent[]>(
    () =>
      initialSnapshot?.events.filter((item) =>
        isUpcomingEvent(item, Date.now()),
      ) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [menuBarOnlyMeetings, setMenuBarOnlyMeetings] = useState(
    initialDisplaySettings.onlyMeetings,
  );
  const [menuBarEventCount, setMenuBarEventCount] = useState(
    initialDisplaySettings.eventCount,
  );
  const [menuBarDateStyle, setMenuBarDateStyle] = useState<MenuBarDateStyle>(
    initialDisplaySettings.dateStyle,
  );
  const [menuBarRowLayout, setMenuBarRowLayout] = useState<MenuBarRowLayout>(
    initialDisplaySettings.rowLayout,
  );
  const [menuBarHeadlineStyle, setMenuBarHeadlineStyle] =
    useState<MenuBarHeadlineStyle>(preferences.menuBarHeadlineStyle ?? "smart");

  const syncMenuBarRuntimeSettings = useCallback(async () => {
    const settings = await readMenuBarDisplaySettings();
    setMenuBarOnlyMeetings(settings.onlyMeetings);
    setMenuBarEventCount(settings.eventCount);
    setMenuBarDateStyle(settings.dateStyle);
    setMenuBarRowLayout(settings.rowLayout);
    return settings;
  }, []);

  const reload = useCallback(async () => {
    if (!sessionIsCurrent()) return;
    const latestPreferences = getPreferenceValues<Preferences>();
    setMenuBarHeadlineStyle(latestPreferences.menuBarHeadlineStyle ?? "smart");

    // Calendar Settings lives in a separate Raycast command. Its LocalStorage
    // changes do not automatically update this already-running menu-bar
    // component, so every explicit/background refresh re-reads the runtime
    // menu settings before rendering.
    await syncMenuBarRuntimeSettings();
    if (!sessionIsCurrent()) return;

    if (latestPreferences.menuBarMode === "never") return;

    setIsLoading(true);
    setError(null);
    setNow(new Date());

    try {
      const complete = await isCalendarSetupComplete();
      if (!sessionIsCurrent()) return;
      setSetupComplete(complete);
      if (!complete) {
        setEvents([]);
        writeMenuBarSnapshot({
          updatedAt: Date.now(),
          setupComplete: false,
          events: [],
        });
        return;
      }

      const enabledCalendarIds =
        latestPreferences.calendarSelectionMode === "custom"
          ? await getMenuBarEnabledCalendarIds()
          : null;

      if (!sessionIsCurrent()) return;
      const data = await loadSchedule({
        // Keep a generous warm event cache so changing Events Shown is purely a
        // display operation. The menu still renders only the configured row count.
        // Ninety days is intentionally wider than the old 14-day window so a
        // sparse calendar can still supply up to 15 upcoming rows.
        daysAhead: 90,
        hideDeclined: Boolean(latestPreferences.hideDeclined),
        selectionMode: latestPreferences.calendarSelectionMode,
        enabledCalendarIds,
      });

      if (!sessionIsCurrent()) return;
      const freshEvents = data.events.filter((item) =>
        isUpcomingEvent(item, Date.now()),
      );
      setEvents(freshEvents);
      writeMenuBarSnapshot({
        updatedAt: Date.now(),
        setupComplete: complete,
        events: freshEvents,
      });
    } catch (err) {
      if (sessionIsCurrent())
        setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (sessionIsCurrent()) setIsLoading(false);
    }
  }, [syncMenuBarRuntimeSettings, sessionIsCurrent]);

  useEffect(() => {
    if (preferences.menuBarMode === "never") {
      setIsLoading(false);
      return;
    }

    const cached = readMenuBarSnapshot();
    const cacheIsFresh =
      cached && Date.now() - cached.updatedAt <= MENU_BAR_CACHE_STALE_MS;

    if (cached) {
      setSetupComplete(cached.setupComplete);
      setEvents(
        cached.events.filter((item) => isUpcomingEvent(item, Date.now())),
      );
      setNow(new Date());
    }

    // A Settings save can launch this command specifically to re-render visual
    // options such as row order or row count. Those changes do not need a
    // network round trip: read LocalStorage, render from the warm event cache,
    // and finish immediately so Raycast replaces the menu-bar snapshot now.
    if (displayOnlyRefresh) {
      void syncMenuBarRuntimeSettings().finally(() => setIsLoading(false));
      return;
    }

    // Raycast loads a menu-bar command every time its item is clicked. Do not
    // hit Google Calendar on every click: background refresh keeps this cache
    // warm. Fetch only for full background launches or when the cache is stale.
    if (environment.launchType === LaunchType.Background || !cacheIsFresh) {
      void reload();
    } else {
      setIsLoading(false);
    }
  }, [
    displayOnlyRefresh,
    preferences.menuBarMode,
    reload,
    syncMenuBarRuntimeSettings,
  ]);

  useEffect(() => {
    // Also load these settings on a normal cache hit, where reload() may be
    // skipped. The display-only background path above already does this once.
    if (!displayOnlyRefresh) {
      void syncMenuBarRuntimeSettings();
    }
  }, [displayOnlyRefresh, syncMenuBarRuntimeSettings]);

  useEffect(() => {
    if (
      environment.launchType !== LaunchType.UserInitiated ||
      setupComplete !== false ||
      setupRedirectStartedRef.current
    )
      return;

    // Only explicit launches guide the user into setup. Recheck the existing
    // account-scoped flag because an incomplete snapshot may outlive setup.
    // Keep the guard set even on failure: the dropdown CTA allows a manual
    // retry without repeated automatic launches or a polling worker.
    setupRedirectStartedRef.current = true;
    void isCalendarSetupComplete()
      .then(async (complete) => {
        if (!sessionIsCurrent()) return;
        setSetupComplete(complete);
        if (complete) return;
        await launchCommand({
          name: "set-up-calendars",
          type: LaunchType.UserInitiated,
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [setupComplete, sessionIsCurrent]);

  const toggleMeetingFilter = useCallback(async () => {
    const next = !menuBarOnlyMeetings;

    // Persist before updating React state. When switching from meetings-only
    // back to all events, the normal visibility rules can legitimately make
    // the menu-bar item disappear. Updating state before the LocalStorage
    // write finished could therefore unload this menu-bar worker while its
    // action callback was still awaiting, producing Raycast's "Worker unloaded"
    // error. Keep the current menu mounted until persistence has completed,
    // then apply the saved value as the final step of the action.
    const saved = await updateMenuBarDisplaySettings({ onlyMeetings: next });
    setMenuBarOnlyMeetings(saved.onlyMeetings);
  }, [menuBarOnlyMeetings]);

  // Keep the headline, dropdown list and "Next Event Actions" in sync.
  // When meeting-only mode is enabled, non-meeting events are completely
  // hidden from the menu-bar experience rather than only from the headline.
  const menuEvents = useMemo(
    () =>
      menuBarOnlyMeetings
        ? events.filter((item) => Boolean(conferenceUrl(item)))
        : events,
    [events, menuBarOnlyMeetings],
  );

  const headline = useMemo(
    () => headlineForMode(preferences.menuBarMode, menuEvents, now),
    [menuEvents, now, preferences.menuBarMode],
  );

  if (preferences.menuBarMode === "never") return null;

  // Meeting-only is a runtime filter controlled from inside this menu.
  // Never remove the MenuBarExtra completely while that filter is active,
  // otherwise the user can strand themselves with no way to switch back.
  //
  // When no meeting currently qualifies for the selected visibility window,
  // keep a compact icon-only recovery handle. As soon as a meeting qualifies,
  // the normal event headline returns.
  const keepMeetingFilterHandle =
    menuBarOnlyMeetings && setupComplete !== false;

  if (
    !headline.visible &&
    !keepMeetingFilterHandle &&
    !isLoading &&
    !error &&
    setupComplete !== false
  ) {
    return null;
  }

  const menuTitle = headline.visible
    ? menuBarHeadlineStyle === "event-only"
      ? eventOnlyHeadlineTitle(headline.item)
      : smartHeadlineTitle(
          headline.item,
          now,
          preferences.menuBarMode,
          menuBarOnlyMeetings,
          menuBarDateStyle,
        )
    : undefined;

  const tooltip =
    headline.item && headline.visible
      ? `${eventTitle(headline.item)} — ${
          menuRowDate(headline.item, now, menuBarDateStyle)
            ? `${menuRowDate(headline.item, now, menuBarDateStyle)} · `
            : ""
        }${menuRowTime(headline.item, now)}`
      : menuBarOnlyMeetings
        ? "DayCal — meetings only"
        : "DayCal";

  return (
    <MenuBarExtra
      key={`${environment.appearance}:${menuBarOnlyMeetings}:${menuBarEventCount}:${menuBarDateStyle}:${menuBarRowLayout}`}
      icon={{ source: Icon.Calendar, tintColor: Color.PrimaryText }}
      title={menuTitle}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      {setupComplete === false ? (
        <MenuBarExtra.Section title="DayCal">
          <MenuBarExtra.Item
            title="Open Calendar"
            icon={{ source: Icon.Calendar, tintColor: Color.PrimaryText }}
            onAction={openCalendarInBrowser}
          />
          <MenuBarExtra.Item
            title="Set Up Calendars"
            subtitle="Finish first-run calendar setup"
            icon={{ source: Icon.Gear, tintColor: Color.PrimaryText }}
            onAction={() =>
              launchCommand({
                name: "set-up-calendars",
                type: LaunchType.UserInitiated,
              })
            }
          />
        </MenuBarExtra.Section>
      ) : null}

      {error ? (
        <MenuBarExtra.Section title="Calendar Error">
          <MenuBarExtra.Item
            title="Could not load Google Calendar"
            subtitle={error}
            icon={{ source: Icon.Warning, tintColor: Color.PrimaryText }}
            onAction={reload}
          />
        </MenuBarExtra.Section>
      ) : null}

      {!error && setupComplete !== false ? (
        <MenuBarExtra.Section title="Upcoming">
          {menuEvents.slice(0, menuBarEventCount).length ? (
            menuEvents.slice(0, menuBarEventCount).map((item) => {
              const color = calendarDisplayColor(item) || Color.SecondaryText;
              const ordinaryEvent =
                !item.event.eventType || item.event.eventType === "default";
              const recurringEvent = Boolean(
                item.event.recurringEventId || item.event.recurrence?.length,
              );
              // Preserve meeting/location shortcuts. Only ordinary writable
              // events get a transfer shortcut in the otherwise unused slot.
              const transferSlotAvailable =
                !conferenceUrl(item) &&
                !item.event.location?.trim() &&
                !isGmailGeneratedEvent(item.event) &&
                canModifyEvent(item.calendar, item.event) &&
                ordinaryEvent;
              const promotedCopy = transferSlotAvailable && recurringEvent;
              const showMove =
                transferSlotAvailable &&
                !recurringEvent &&
                transferModeFor(item.calendar, item.event) === "move";
              return (
                <MenuBarExtra.Submenu
                  key={`${item.calendar.id}:${item.event.id}`}
                  title={menuRowTitle(
                    item,
                    now,
                    menuBarRowLayout,
                    menuBarDateStyle,
                  )}
                  icon={{ source: Icon.Circle, tintColor: color }}
                >
                  <MenuBarExtra.Item
                    title="Open Event"
                    icon={{
                      source: Icon.Calendar,
                      tintColor: Color.PrimaryText,
                    }}
                    onAction={() => open(calendarEventBrowserUrl(item))}
                  />

                  {isGmailGeneratedEvent(item.event) ? (
                    <MenuBarExtra.Item
                      title="Copy to Calendar…"
                      icon={{
                        source: Icon.CopyClipboard,
                        tintColor: Color.PrimaryText,
                      }}
                      onAction={() => launchEventAction(item, "copy")}
                    />
                  ) : canModifyEvent(item.calendar, item.event) ? (
                    <MenuBarExtra.Item
                      title="Edit Event"
                      icon={{
                        source: Icon.Pencil,
                        tintColor: Color.PrimaryText,
                      }}
                      onAction={() => launchEventAction(item, "edit")}
                    />
                  ) : item.event.eventType !== "birthday" ? (
                    <MenuBarExtra.Item
                      title="Copy to Calendar…"
                      icon={{
                        source: Icon.CopyClipboard,
                        tintColor: Color.PrimaryText,
                      }}
                      onAction={() => launchEventAction(item, "copy")}
                    />
                  ) : null}

                  {conferenceUrl(item) ? (
                    <MenuBarExtra.Item
                      title="Join Meeting"
                      icon={{
                        source: Icon.Video,
                        tintColor: Color.PrimaryText,
                      }}
                      onAction={() => open(conferenceUrl(item)!)}
                    />
                  ) : null}

                  {item.event.location?.trim() ? (
                    <MenuBarExtra.Item
                      title="Open Location"
                      icon={{ source: Icon.Map, tintColor: Color.PrimaryText }}
                      onAction={() =>
                        open(mapsUrl(item.event.location!.trim()))
                      }
                    />
                  ) : null}

                  {showMove ? (
                    <MenuBarExtra.Item
                      title="Move to Calendar…"
                      icon={{
                        source: Icon.ArrowRight,
                        tintColor: Color.PrimaryText,
                      }}
                      onAction={() => launchEventAction(item, "move")}
                    />
                  ) : promotedCopy ? (
                    <MenuBarExtra.Item
                      title="Copy to Calendar…"
                      icon={{
                        source: Icon.CopyClipboard,
                        tintColor: Color.PrimaryText,
                      }}
                      onAction={() => launchEventAction(item, "copy")}
                    />
                  ) : null}

                  <MenuBarExtra.Item
                    title="More Actions…"
                    icon={{
                      source: Icon.Ellipsis,
                      tintColor: Color.PrimaryText,
                    }}
                    onAction={() =>
                      launchEventAction(item, "view", promotedCopy)
                    }
                  />

                  <MenuBarExtra.Separator />

                  {canModifyEvent(item.calendar, item.event) ? (
                    <MenuBarExtra.Item
                      title="Delete Event…"
                      icon={{ source: Icon.Trash, tintColor: Color.Red }}
                      onAction={() => launchEventAction(item, "delete")}
                    />
                  ) : (
                    <MenuBarExtra.Item
                      title={
                        item.event.organizer?.self === false
                          ? "Guest Event"
                          : "Read-only Event"
                      }
                      icon={{
                        source: Icon.Lock,
                        tintColor: Color.SecondaryText,
                      }}
                    />
                  )}
                </MenuBarExtra.Submenu>
              );
            })
          ) : (
            <MenuBarExtra.Item
              title={
                menuBarOnlyMeetings
                  ? "No upcoming meetings in the next 90 days"
                  : "No upcoming events in the next 90 days"
              }
            />
          )}
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section title="DayCal">
        <MenuBarExtra.Item
          title="Open Calendar"
          icon={{ source: Icon.Calendar, tintColor: Color.PrimaryText }}
          onAction={openCalendarInBrowser}
        />
        <MenuBarExtra.Item
          title="Open Schedule"
          icon={{ source: Icon.Calendar, tintColor: Color.PrimaryText }}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={() =>
            launchCommand({
              name: "schedule",
              type: LaunchType.UserInitiated,
            })
          }
        />

        <MenuBarExtra.Submenu
          title="Add Event"
          icon={{ source: Icon.Plus, tintColor: Color.PrimaryText }}
        >
          <MenuBarExtra.Item
            title="Personal"
            icon={{ source: Icon.Calendar, tintColor: Color.PrimaryText }}
            onAction={() =>
              launchCommand({
                name: "add-personal-event",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <MenuBarExtra.Item
            title="Work"
            icon={{ source: Icon.Calendar, tintColor: Color.PrimaryText }}
            onAction={() =>
              launchCommand({
                name: "add-work-event",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <MenuBarExtra.Item
            title="Shared / Partner"
            icon={{ source: Icon.Calendar, tintColor: Color.PrimaryText }}
            onAction={() =>
              launchCommand({
                name: "add-shared-event",
                type: LaunchType.UserInitiated,
              })
            }
          />
        </MenuBarExtra.Submenu>

        <MenuBarExtra.Item
          title="Enabled Calendars…"
          icon={{ source: Icon.Eye, tintColor: Color.PrimaryText }}
          onAction={() =>
            launchCommand({
              name: "enabled-calendars",
              type: LaunchType.UserInitiated,
            })
          }
        />

        <MenuBarExtra.Item
          title={menuBarOnlyMeetings ? "Show All Events" : "Show Meetings Only"}
          icon={{ source: Icon.Video, tintColor: Color.PrimaryText }}
          onAction={toggleMeetingFilter}
        />

        <MenuBarExtra.Item
          title="Refresh"
          icon={{ source: Icon.ArrowClockwise, tintColor: Color.PrimaryText }}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={reload}
        />

        <MenuBarExtra.Item
          title="Settings…"
          icon={{ source: Icon.Gear, tintColor: Color.PrimaryText }}
          onAction={() =>
            launchCommand({
              name: "menu-bar-settings",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

const AuthenticatedMenuBar = withAccessToken(googleOAuth)(Command);

function SignedOutMenuBar({ isLoading = false }: { isLoading?: boolean } = {}) {
  return (
    <MenuBarExtra
      icon={{ source: Icon.Calendar, tintColor: Color.PrimaryText }}
      tooltip="DayCal"
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="DayCal">
        <MenuBarExtra.Item
          title="Set Up Calendars"
          subtitle="Connect Google Calendar to get started"
          icon={{ source: Icon.Gear, tintColor: Color.PrimaryText }}
          onAction={() =>
            launchCommand({
              name: "set-up-calendars",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

// Token presence is checked without authorizing. Only the authenticated child
// uses withAccessToken (including its normal token refresh behavior).
export default function MenuBarShell(
  props: LaunchProps<{ launchContext?: MenuBarLaunchContext }>,
) {
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [connection, setConnection] = useState<{
    revision: string;
    context: typeof props.launchContext;
  } | null>(null);

  useEffect(() => {
    let disposed = false;
    let check = 0;
    const checkConnection = async () => {
      const attempt = ++check;
      const revision = menuBarSessionRevision();
      setIsCheckingConnection(true);
      setConnection(null); // Unmount the authenticated tree and its event state.
      try {
        const tokens = await googleOAuth.client.getTokens();
        if (
          !disposed &&
          attempt === check &&
          revision === menuBarSessionRevision()
        ) {
          setConnection(
            tokens?.accessToken
              ? { revision, context: props.launchContext }
              : null,
          );
        }
      } catch {
        // Missing/unreadable credentials must not expose a cached schedule.
      } finally {
        if (!disposed && attempt === check) setIsCheckingConnection(false);
      }
    };
    const unsubscribe = subscribeMenuBarSession(() => {
      void checkConnection();
    });
    void checkConnection();
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [props.launchContext]);

  if (
    !connection ||
    connection.context !== props.launchContext ||
    connection.revision !== menuBarSessionRevision()
  ) {
    return <SignedOutMenuBar isLoading={isCheckingConnection} />;
  }
  return <AuthenticatedMenuBar key={connection.revision} {...props} />;
}
