import { withAccessToken } from "@raycast/utils";
import { googleOAuth } from "./lib/google-oauth";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  LaunchProps,
  LaunchType,
  Toast,
  confirmAlert,
  getPreferenceValues,
  launchCommand,
  open,
  showToast,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditEvent from "./edit-event";
import { ConnectionCheckView } from "./check-connection";
import {
  CalendarTransferView,
  EventActionsCommandView,
  EventActionsView,
  EventActionsLaunchContext,
  canEditEvent,
  canModifyEvent,
  isGmailGeneratedEvent,
  transferModeFor,
} from "./event-actions";
import {
  CalendarSelectionMode,
  getScheduleEnabledCalendarIds,
  isCalendarSetupComplete,
} from "./lib/calendar-settings";
import { deleteEvent } from "./lib/google";
import {
  attendeeCount,
  calendarDisplayColor,
  calendarDisplayName,
  calendarEntryDisplayName,
  compactDateLabel,
  compactSectionKey,
  compactSectionTitle,
  conferenceUrl,
  isRecurringEvent,
  loadSchedule,
  statusLabel,
  scheduleOverview,
} from "./lib/schedule";
import { GoogleCalendarEntry, ScheduleEvent } from "./lib/types";

interface Preferences {
  daysAhead: string;
  hideDeclined: boolean;
  calendarSelectionMode: CalendarSelectionMode;
}

function mapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function clipboardEventTime(item: ScheduleEvent): string {
  const event = item.event;

  if (event.start.date && !event.start.dateTime) {
    const start = new Date(`${event.start.date}T00:00:00`);
    const formatter = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    if (event.end.date) {
      // Google all-day end dates are exclusive, so subtract one day for the
      // human-readable final day.
      const inclusiveEnd = new Date(`${event.end.date}T00:00:00`);
      inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);

      if (inclusiveEnd.getTime() > start.getTime()) {
        return `${formatter.format(start)}–${formatter.format(inclusiveEnd)} · All day`;
      }
    }

    return `${formatter.format(start)} · All day`;
  }

  if (!event.start.dateTime) return "Time unavailable";

  const start = new Date(event.start.dateTime);
  const end = event.end.dateTime ? new Date(event.end.dateTime) : null;

  const date = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(start);

  const clock = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return end
    ? `${date} · ${clock.format(start)}–${clock.format(end)}`
    : `${date} · ${clock.format(start)}`;
}

function clipboardEventDetails(
  item: ScheduleEvent,
  meeting: string | undefined,
): string {
  const lines = [
    item.event.summary || "Untitled Event",
    clipboardEventTime(item),
    `Calendar: ${calendarDisplayName(item)}`,
  ];

  if (item.event.location?.trim()) {
    lines.push(`Location: ${item.event.location.trim()}`);
  }
  if (meeting) lines.push(`Meeting: ${meeting}`);
  if (item.event.description?.trim()) {
    lines.push("", item.event.description.trim());
  }

  return lines.join("\n");
}

type ScheduleLaunchProps = LaunchProps<{
  launchContext: EventActionsLaunchContext;
}>;

function scheduleSelectionSignature(ids: string[] | null): string {
  if (ids === null) return "google-fallback";
  return JSON.stringify([...ids].sort());
}

async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({
      name: "menu-bar",
      type: LaunchType.Background,
      context: { refreshMode: "full" },
    });
  } catch {
    // Non-fatal: the menu bar may be disabled or already relaunching.
  }
}

function AddEventSubmenu() {
  return (
    <ActionPanel.Submenu
      title="Add Event…"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
    >
      <Action
        title="Personal"
        icon={Icon.Calendar}
        onAction={() =>
          launchCommand({
            name: "add-personal-event",
            type: LaunchType.UserInitiated,
          })
        }
      />
      <Action
        title="Work"
        icon={Icon.Calendar}
        onAction={() =>
          launchCommand({
            name: "add-work-event",
            type: LaunchType.UserInitiated,
          })
        }
      />
      <Action
        title="Shared / Partner"
        icon={Icon.Calendar}
        onAction={() =>
          launchCommand({
            name: "add-shared-event",
            type: LaunchType.UserInitiated,
          })
        }
      />
    </ActionPanel.Submenu>
  );
}

function Command(props: ScheduleLaunchProps) {
  const target = props.launchContext;

  if (target?.calendar && target?.event) {
    return <EventActionsCommandView {...props} />;
  }

  return <ScheduleView />;
}

function ScheduleView() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [birthdays, setBirthdays] = useState<ScheduleEvent[]>([]);
  const [calendars, setCalendars] = useState<GoogleCalendarEntry[]>([]);
  const [calendarFilter, setCalendarFilter] = useState("all");
  const scheduleSelectionSignatureRef = useRef<string | null>(null);
  const setupRedirectStartedRef = useRef(false);
  const [setupRedirectError, setSetupRedirectError] = useState<string | null>(
    null,
  );

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const enabledCalendarIds =
        preferences.calendarSelectionMode === "custom"
          ? await getScheduleEnabledCalendarIds()
          : null;

      scheduleSelectionSignatureRef.current =
        preferences.calendarSelectionMode === "custom"
          ? scheduleSelectionSignature(enabledCalendarIds)
          : `mode:${preferences.calendarSelectionMode}`;

      const data = await loadSchedule({
        daysAhead: Number(preferences.daysAhead || "14"),
        hideDeclined: Boolean(preferences.hideDeclined),
        selectionMode: preferences.calendarSelectionMode,
        enabledCalendarIds,
      });
      setEvents(data.events);
      setBirthdays(data.birthdays);
      setCalendars(data.calendars);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [
    preferences.daysAhead,
    preferences.hideDeclined,
    preferences.calendarSelectionMode,
  ]);

  const refreshAfterScheduleMutation = useCallback(async () => {
    await reload();
    void refreshMenuBar();
  }, [reload]);

  useEffect(() => {
    void isCalendarSetupComplete().then(setSetupComplete);
  }, []);

  // A newly connected Google account should not leave the user wondering why
  // Schedule is showing setup fields inside a different command. Route first-run
  // users straight to the dedicated Set Up Calendars command instead.
  useEffect(() => {
    if (setupComplete !== false || setupRedirectStartedRef.current) return;

    setupRedirectStartedRef.current = true;
    setSetupRedirectError(null);

    void launchCommand({
      name: "set-up-calendars",
      type: LaunchType.UserInitiated,
    }).catch((err) => {
      setupRedirectStartedRef.current = false;
      setSetupRedirectError(err instanceof Error ? err.message : String(err));
    });
  }, [setupComplete]);

  // Do not poll while the separate setup command is open. Raycast keeps the
  // originating Schedule command alive in the navigation stack, so repeated
  // account-scoped storage checks would create unnecessary long-lived work.
  // The setup completion screen opens a fresh Schedule command instead.

  useEffect(() => {
    if (setupComplete) void reload();
  }, [reload, setupComplete]);

  // Calendar Settings can stay mounted in Raycast's navigation stack. When
  // the user changes the independent Schedule calendar list, re-read that
  // LocalStorage selection while this view is alive so returning to Schedule
  // never shows the old calendar set.
  useEffect(() => {
    if (!setupComplete) return;

    let active = true;

    const checkForCalendarSelectionChange = async () => {
      try {
        const signature =
          preferences.calendarSelectionMode === "custom"
            ? scheduleSelectionSignature(await getScheduleEnabledCalendarIds())
            : `mode:${preferences.calendarSelectionMode}`;

        if (!active) return;

        const previous = scheduleSelectionSignatureRef.current;
        if (previous !== null && previous !== signature) {
          scheduleSelectionSignatureRef.current = signature;
          setCalendarFilter("all");
          await reload();
        }
      } catch {
        // A normal manual refresh remains available if LocalStorage is
        // temporarily unavailable.
      }
    };

    const timer = setInterval(() => {
      void checkForCalendarSelectionChange();
    }, 750);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [preferences.calendarSelectionMode, reload, setupComplete]);

  // If a calendar was selected in the dropdown and then disabled in Calendar
  // Settings, Raycast can retain that now-invalid filter value. Reset it to
  // the aggregate view so the dropdown and the visible events stay in sync.
  useEffect(() => {
    if (calendarFilter === "all") return;
    if (calendarFilter === "Birthdays") {
      if (birthdays.length === 0) setCalendarFilter("all");
      return;
    }
    if (!calendars.some((calendar) => calendar.id === calendarFilter)) {
      setCalendarFilter("all");
    }
  }, [birthdays.length, calendarFilter, calendars]);

  const filtered = useMemo(() => {
    if (calendarFilter === "all") return events;

    // Birthdays are shown as their own synthetic layer. Google may expose them
    // through the primary calendar, but they should never appear when the user
    // explicitly filters to Personal (or any other real calendar).
    if (calendarFilter === "Birthdays") return birthdays;

    return events.filter(
      (item) =>
        item.calendar.id === calendarFilter &&
        item.syntheticCalendarName !== "Birthdays",
    );
  }, [birthdays, calendarFilter, events]);

  const overview = useMemo(() => scheduleOverview(filtered), [filtered]);

  const grouped = useMemo(() => {
    const map = new Map<
      ReturnType<typeof compactSectionKey>,
      ScheduleEvent[]
    >();
    for (const item of filtered) {
      const key = compactSectionKey(item);
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    // Events are already chronological, so Map insertion order gives the same
    // compact section ordering as the native My Schedule view.
    return Array.from(map.entries());
  }, [filtered]);

  async function remove(item: ScheduleEvent) {
    const confirmed = await confirmAlert({
      title: `Delete “${item.event.summary || "Untitled"}”?`,
      message: "This removes the event from Google Calendar.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await deleteEvent(item.calendar.id, item.event.id);
      await refreshAfterScheduleMutation();
      await showToast({ style: Toast.Style.Success, title: "Event deleted" });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete event",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (setupComplete === null) {
    return <List isLoading searchBarPlaceholder="Loading DayCal…" />;
  }

  if (!setupComplete) {
    return (
      <List searchBarPlaceholder="Opening calendar setup…">
        <List.EmptyView
          icon={setupRedirectError ? Icon.Warning : Icon.Gear}
          title={
            setupRedirectError
              ? "Could not open Set Up Calendars"
              : "Opening Set Up Calendars…"
          }
          description={
            setupRedirectError
              ? setupRedirectError
              : "Finish the guided setup for this Google account, then DayCal will be ready to use."
          }
          actions={
            setupRedirectError ? (
              <ActionPanel>
                <Action
                  title="Open Set up Calendars"
                  icon={Icon.Gear}
                  onAction={() => {
                    setupRedirectStartedRef.current = true;
                    setSetupRedirectError(null);
                    void launchCommand({
                      name: "set-up-calendars",
                      type: LaunchType.UserInitiated,
                    }).catch((err) => {
                      setupRedirectStartedRef.current = false;
                      setSetupRedirectError(
                        err instanceof Error ? err.message : String(err),
                      );
                    });
                  }}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      </List>
    );
  }

  if (error) {
    return (
      <List searchBarPlaceholder="Search schedule…">
        <List.EmptyView
          icon={Icon.Warning}
          title="Google Calendar is not ready"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={reload}
              />
              <Action.Push
                title="Check Google Calendar Connection"
                icon={Icon.Globe}
                target={<ConnectionCheckView />}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const hasBirthdays = birthdays.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search your schedule…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Calendar"
          value={calendarFilter}
          onChange={setCalendarFilter}
        >
          <List.Dropdown.Item title="All Enabled Calendars" value="all" />
          {hasBirthdays ? (
            <List.Dropdown.Item title="Birthdays" value="Birthdays" />
          ) : null}
          {calendars
            .slice()
            .sort((a, b) =>
              calendarEntryDisplayName(a).localeCompare(
                calendarEntryDisplayName(b),
              ),
            )
            .map((calendar) => (
              <List.Dropdown.Item
                key={calendar.id}
                title={calendarEntryDisplayName(calendar)}
                value={calendar.id}
              />
            ))}
        </List.Dropdown>
      }
    >
      {!isLoading ? (
        <List.Section
          title={overview.greeting}
          subtitle={overview.todaySummary}
        >
          {overview.nextUp ? (
            <List.Item
              id="schedule-overview-next-up"
              title="Next Up"
              icon={Icon.ArrowRight}
              accessories={[{ text: overview.nextUp.summary }]}
              actions={
                <ActionPanel>
                  {overview.nextUp.item.event.htmlLink ? (
                    <Action.OpenInBrowser
                      title="Open in Google Calendar"
                      url={overview.nextUp.item.event.htmlLink}
                      icon={Icon.Calendar}
                    />
                  ) : null}
                  <AddEventSubmenu />
                  <Action
                    title="Refresh Schedule"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={reload}
                  />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              id="schedule-overview-refresh"
              title="No upcoming events"
              icon={Icon.Calendar}
              actions={
                <ActionPanel>
                  <AddEventSubmenu />
                  <Action
                    title="Refresh Schedule"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={reload}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      ) : null}

      {!isLoading && grouped.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title={
            calendarFilter === "Birthdays"
              ? "No birthdays found"
              : "Nothing scheduled"
          }
          description={
            calendarFilter === "Birthdays"
              ? "No upcoming birthdays were found in the next year."
              : "No events in this window."
          }
          actions={
            <ActionPanel>
              <AddEventSubmenu />
              <Action
                title="Refresh Schedule"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={reload}
              />
            </ActionPanel>
          }
        />
      ) : null}

      {grouped.map(([key, items]) => (
        <List.Section key={key} title={compactSectionTitle(key)}>
          {items.map((item) => {
            const title = item.event.summary || "Untitled Event";
            const calendarName = calendarDisplayName(item);
            const color = calendarDisplayColor(item) || Color.SecondaryText;
            const live = statusLabel(item);
            const meeting = conferenceUrl(item);
            const modifiable = canModifyEvent(item.calendar, item.event);
            const gmailGenerated = isGmailGeneratedEvent(item.event);
            const editable =
              canEditEvent(item.calendar, item.event) && !gmailGenerated;
            const transferMode = transferModeFor(item.calendar, item.event);
            const timed = Boolean(
              item.event.start.dateTime && item.event.end.dateTime,
            );
            const guests = attendeeCount(item);
            const recurring = isRecurringEvent(item);
            const eventDetails = clipboardEventDetails(item, meeting);
            const dateLabel = compactDateLabel(item, key);
            const paddedDate = dateLabel.padEnd(7, "\u00A0");
            const compactTitle = `${paddedDate}  ${title}`;

            return (
              <List.Item
                key={`${item.calendar.id}:${item.event.id}`}
                title={compactTitle}
                icon={{ source: Icon.Circle, tintColor: color }}
                keywords={[calendarName, item.event.location || ""]}
                accessories={[
                  ...(live
                    ? [{ tag: { value: live, color: Color.Green } }]
                    : []),
                  ...(guests > 0
                    ? [{ icon: Icon.Person, text: String(guests) }]
                    : []),
                  ...(recurring
                    ? [
                        {
                          icon: Icon.ArrowClockwise,
                          tooltip: "Recurring event",
                        },
                      ]
                    : []),
                ]}
                actions={
                  <ActionPanel>
                    {item.event.htmlLink ? (
                      <Action.OpenInBrowser
                        title="Open in Google Calendar"
                        url={item.event.htmlLink}
                        icon={Icon.Calendar}
                      />
                    ) : null}

                    {editable && timed ? (
                      <Action.Push
                        title="Edit in Raycast"
                        icon={Icon.Pencil}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        target={
                          <EditEvent
                            calendar={item.calendar}
                            event={item.event}
                            onSaved={refreshAfterScheduleMutation}
                          />
                        }
                      />
                    ) : modifiable && item.event.start.date ? (
                      <Action.Push
                        title="Edit Event"
                        icon={Icon.Pencil}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        target={
                          <EditEvent
                            calendar={item.calendar}
                            event={item.event}
                            onSaved={refreshAfterScheduleMutation}
                          />
                        }
                      />
                    ) : null}

                    {transferMode ? (
                      <Action.Push
                        title={
                          transferMode === "move"
                            ? "Move to Calendar…"
                            : "Copy to Calendar…"
                        }
                        icon={
                          transferMode === "move"
                            ? Icon.ArrowRight
                            : Icon.CopyClipboard
                        }
                        shortcut={
                          transferMode === "move"
                            ? { modifiers: ["cmd", "shift"], key: "m" }
                            : { modifiers: ["cmd", "shift"], key: "c" }
                        }
                        target={
                          <CalendarTransferView
                            sourceCalendar={item.calendar}
                            event={item.event}
                            mode={transferMode}
                            onTransferred={reload}
                          />
                        }
                      />
                    ) : null}

                    <ActionPanel.Section title="Event">
                      {meeting ? (
                        <Action.OpenInBrowser
                          title="Join Meeting"
                          url={meeting}
                          icon={Icon.Video}
                          shortcut={{ modifiers: ["cmd"], key: "j" }}
                        />
                      ) : null}

                      {item.event.location ? (
                        <Action
                          title="Open Location"
                          icon={Icon.Map}
                          shortcut={{ modifiers: ["cmd"], key: "l" }}
                          onAction={() => open(mapsUrl(item.event.location!))}
                        />
                      ) : null}

                      <Action.CopyToClipboard
                        title="Copy Event Details"
                        content={eventDetails}
                        icon={Icon.Clipboard}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />

                      <Action.CopyToClipboard
                        title="Copy Event Title"
                        content={title}
                        icon={Icon.Clipboard}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                      />

                      {meeting ? (
                        <Action.CopyToClipboard
                          title="Copy Meeting Link"
                          content={meeting}
                          icon={Icon.Link}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                        />
                      ) : null}

                      {item.event.location ? (
                        <Action.CopyToClipboard
                          title="Copy Location"
                          content={item.event.location}
                          icon={Icon.Clipboard}
                        />
                      ) : null}

                      <Action.Push
                        title="More Actions…"
                        icon={Icon.Ellipsis}
                        target={
                          <EventActionsView
                            calendar={item.calendar}
                            event={item.event}
                            onChanged={reload}
                          />
                        }
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Schedule">
                      <AddEventSubmenu />
                      <Action
                        title="Refresh Schedule"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={reload}
                      />
                      {modifiable ? (
                        <Action
                          title="Delete Event"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{
                            modifiers: ["cmd", "shift"],
                            key: "backspace",
                          }}
                          onAction={() => remove(item)}
                        />
                      ) : null}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

export default withAccessToken(googleOAuth)(Command);
