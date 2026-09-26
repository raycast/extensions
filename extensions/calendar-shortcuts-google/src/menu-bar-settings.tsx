import { withAccessToken } from "@raycast/utils";
import { googleOAuth } from "./lib/google-oauth";
import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  LaunchType,
  Toast,
  getPreferenceValues,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarSelectionMode,
  calendarEntryDisplayName,
  getMenuBarEnabledCalendarIds,
  getScheduleEnabledCalendarIds,
  googleVisibleCalendarIds,
  setMenuBarEnabledCalendarIds,
  setScheduleEnabledCalendarIds,
} from "./lib/calendar-settings";
import { listCalendars } from "./lib/google";
import {
  MenuBarDateStyle,
  MenuBarRowLayout,
  normaliseMenuBarDisplaySettings,
  readMenuBarDisplaySettings,
  writeMenuBarDisplaySettings,
} from "./lib/menu-bar-display-settings";
import { GoogleCalendarEntry } from "./lib/types";

type Values = {
  scheduleCalendars: string[];
  menuBarCalendars: string[];
  onlyMeetings: boolean;
  menuBarEventCount: string;
  menuBarDateStyle: MenuBarDateStyle;
  menuBarRowLayout: MenuBarRowLayout;
};

function formatExampleDate(
  style: MenuBarDateStyle,
  weekday: string,
  day: number,
  month: string,
): string {
  return style === "month-day"
    ? `${weekday} ${month} ${day}`
    : `${weekday} ${day} ${month}`;
}

function menuBarDateExample(style: MenuBarDateStyle): string {
  return formatExampleDate(style, "Wed", 14, "Sep");
}

function menuBarLayoutExample(
  layout: MenuBarRowLayout,
  dateStyle: MenuBarDateStyle,
): string {
  const examples: Record<
    MenuBarRowLayout,
    {
      title: string;
      time: string;
      weekday: string;
      day: number;
      month: string;
    }
  > = {
    "date-time-title": {
      title: "Team Meeting",
      time: "9am–10am",
      weekday: "Mon",
      day: 8,
      month: "Jun",
    },
    "date-title-time": {
      title: "Lunch",
      time: "12:30pm–1:30pm",
      weekday: "Tue",
      day: 21,
      month: "Jul",
    },
    "time-date-title": {
      title: "Gym Session",
      time: "6pm–7pm",
      weekday: "Wed",
      day: 5,
      month: "Aug",
    },
    "time-title-date": {
      title: "Project Review",
      time: "2pm–2:45pm",
      weekday: "Thu",
      day: 17,
      month: "Sep",
    },
    "title-date-time": {
      title: "Focus Time",
      time: "10am–11:30am",
      weekday: "Fri",
      day: 9,
      month: "Oct",
    },
    "title-time-date": {
      title: "Catch Up",
      time: "4:15pm–4:45pm",
      weekday: "Sat",
      day: 14,
      month: "Nov",
    },
  };

  const example = examples[layout];
  const parts = {
    date: formatExampleDate(
      dateStyle,
      example.weekday,
      example.day,
      example.month,
    ),
    time: example.time,
    title: example.title,
  };

  return layout
    .split("-")
    .map((key) => parts[key as keyof typeof parts])
    .join(" · ");
}

function selectionModeLabel(mode: CalendarSelectionMode): string {
  switch (mode) {
    case "custom":
      return "Custom Enabled Calendars";
    case "google":
      return "Google Calendar Visibility";
    case "all":
      return "All Calendars";
  }
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((value, index) => value === right[index]);
}

function Command() {
  const preferences = getPreferenceValues();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarEntry[]>([]);
  const [scheduleCalendars, setScheduleCalendars] = useState<string[]>([]);
  const [menuBarCalendars, setMenuBarCalendars] = useState<string[]>([]);
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [menuBarDirty, setMenuBarDirty] = useState(false);
  const [onlyMeetings, setOnlyMeetings] = useState(false);
  const [menuBarEventCount, setMenuBarEventCount] = useState("10");
  const [menuBarDateStyle, setMenuBarDateStyle] =
    useState<MenuBarDateStyle>("day-month");
  const [menuBarRowLayout, setMenuBarRowLayout] =
    useState<MenuBarRowLayout>("date-time-title");
  const savedMenuBarCalendarsRef = useRef<string[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [allCalendars, storedSchedule, storedMenuBar, displaySettings] =
        await Promise.all([
          listCalendars(),
          getScheduleEnabledCalendarIds(),
          getMenuBarEnabledCalendarIds(),
          readMenuBarDisplaySettings(),
        ]);

      const readableCalendars = allCalendars.filter(
        (calendar) => calendar.accessRole !== "none",
      );
      const defaultIds = googleVisibleCalendarIds(readableCalendars);

      setCalendars(readableCalendars);

      const initialScheduleCalendars = storedSchedule ?? defaultIds;
      const initialMenuBarCalendars = storedMenuBar ?? defaultIds;

      setScheduleCalendars(initialScheduleCalendars);
      setMenuBarCalendars(initialMenuBarCalendars);
      setScheduleDirty(false);
      setMenuBarDirty(false);
      savedMenuBarCalendarsRef.current = initialMenuBarCalendars;

      setOnlyMeetings(displaySettings.onlyMeetings);
      setMenuBarEventCount(String(displaySettings.eventCount));
      setMenuBarDateStyle(displaySettings.dateStyle);
      setMenuBarRowLayout(displaySettings.rowLayout);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Enabled Calendars edits these same two lists and saves immediately.
  // While this form has no unsaved edits for a picker, mirror those external
  // changes so the two screens cannot drift apart or overwrite each other.
  useEffect(() => {
    if (isLoading) return;

    let active = true;

    const syncExternalSelections = async () => {
      try {
        const [storedSchedule, storedMenuBar] = await Promise.all([
          getScheduleEnabledCalendarIds(),
          getMenuBarEnabledCalendarIds(),
        ]);

        if (!active) return;

        if (!scheduleDirty && storedSchedule !== null) {
          setScheduleCalendars((current) =>
            sameIds(current, storedSchedule) ? current : storedSchedule,
          );
        }

        if (!menuBarDirty && storedMenuBar !== null) {
          setMenuBarCalendars((current) => {
            if (sameIds(current, storedMenuBar)) return current;
            savedMenuBarCalendarsRef.current = storedMenuBar;
            return storedMenuBar;
          });
        }
      } catch {
        // A manual reopen remains available if LocalStorage is temporarily
        // unavailable.
      }
    };

    const timer = setInterval(() => {
      void syncExternalSelections();
    }, 750);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isLoading, menuBarDirty, scheduleDirty]);

  const sortedCalendars = useMemo(
    () =>
      calendars
        .slice()
        .sort((a, b) =>
          calendarEntryDisplayName(a).localeCompare(
            calendarEntryDisplayName(b),
          ),
        ),
    [calendars],
  );

  async function save(values: Values) {
    setIsSaving(true);

    try {
      // Use the values submitted by Raycast as the source of truth.
      // The native form can visually update a Dropdown before React's controlled
      // state has reached the submit callback, which made fast Save clicks write
      // the previous value back to LocalStorage (for example 15 events reverting
      // to 5, or US date style reverting to UK). The submitted form values are
      // the authoritative snapshot of what is visible when Save is pressed.
      const displaySettings = normaliseMenuBarDisplaySettings({
        onlyMeetings: Boolean(values.onlyMeetings),
        eventCount: Number(values.menuBarEventCount),
        dateStyle: values.menuBarDateStyle,
        rowLayout: values.menuBarRowLayout,
      });

      const verifiedDisplaySettings =
        await writeMenuBarDisplaySettings(displaySettings);

      const writes: Promise<void>[] = [];

      // Only write a calendar list if the user actually edited that picker in
      // this form. Enabled Calendars saves immediately, so an untouched stale
      // form must never write its older snapshot back over newer choices.
      if (scheduleDirty) {
        writes.push(setScheduleEnabledCalendarIds(values.scheduleCalendars));
      }

      if (menuBarDirty) {
        writes.push(setMenuBarEnabledCalendarIds(values.menuBarCalendars));
      }

      await Promise.all(writes);

      const previousMenuBarCalendars = savedMenuBarCalendarsRef.current;
      const menuBarCalendarsChanged =
        menuBarDirty &&
        !sameIds(previousMenuBarCalendars, values.menuBarCalendars);

      if (scheduleDirty) {
        setScheduleCalendars(values.scheduleCalendars);
      }

      if (menuBarDirty) {
        setMenuBarCalendars(values.menuBarCalendars);
        savedMenuBarCalendarsRef.current = values.menuBarCalendars;
      }

      setScheduleDirty(false);
      setMenuBarDirty(false);
      setOnlyMeetings(verifiedDisplaySettings.onlyMeetings);
      setMenuBarEventCount(String(verifiedDisplaySettings.eventCount));
      setMenuBarDateStyle(verifiedDisplaySettings.dateStyle);
      setMenuBarRowLayout(verifiedDisplaySettings.rowLayout);

      // Trigger the companion menu-bar command immediately. For display-only
      // changes it uses a fast path that re-renders from the existing event
      // cache without waiting for Google Calendar. Calendar-list changes still
      // request a full refresh because the underlying event set may differ.
      try {
        await launchCommand({
          name: "menu-bar",
          type: LaunchType.Background,
          context: {
            refreshMode: menuBarCalendarsChanged ? "full" : "display",
            displaySettings: verifiedDisplaySettings,
          },
        });
      } catch {
        // The menu bar's own Refresh action remains a full fallback refresh.
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Calendar settings saved",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save calendar settings",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (error) {
    return (
      <Form
        navigationTitle="Calendar Settings"
        actions={
          <ActionPanel>
            <Action
              title="Configure Extension"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "opt"], key: "," }}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      >
        <Form.Description title="Could not load calendars" text={error} />
      </Form>
    );
  }

  const modeIsCustom = preferences.calendarSelectionMode === "custom";

  return (
    <Form
      navigationTitle="Calendar Settings"
      isLoading={isLoading || isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Calendar Settings"
            icon={Icon.Checkmark}
            onSubmit={save}
          />

          <Action
            title="Configure Extension"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd", "opt"], key: "," }}
            onAction={async () => {
              try {
                await openExtensionPreferences();
              } catch (err) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not open DayCal settings",
                  message: err instanceof Error ? err.message : String(err),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Enabled Calendars"
        text={
          modeIsCustom
            ? "Schedule and the menu bar use independent calendar lists. Choose exactly which calendars should appear in each."
            : `Your Calendar Selection Mode is currently “${selectionModeLabel(preferences.calendarSelectionMode)}”. The custom lists below will be saved, but they are only used when Calendar Selection Mode is set to Custom Enabled Calendars.`
        }
      />

      <Form.TagPicker
        id="scheduleCalendars"
        title="Schedule Calendars"
        placeholder="Choose calendars for Schedule"
        value={scheduleCalendars}
        onChange={(ids) => {
          setScheduleCalendars(ids);
          setScheduleDirty(true);
        }}
      >
        {sortedCalendars.map((calendar) => (
          <Form.TagPicker.Item
            key={calendar.id}
            value={calendar.id}
            title={calendarEntryDisplayName(calendar)}
            icon={{
              source: Icon.Circle,
              tintColor: calendar.backgroundColor || Color.SecondaryText,
            }}
          />
        ))}
      </Form.TagPicker>

      <Form.TagPicker
        id="menuBarCalendars"
        title="Menu Bar Calendars"
        placeholder="Choose calendars for the menu bar"
        value={menuBarCalendars}
        onChange={(ids) => {
          setMenuBarCalendars(ids);
          setMenuBarDirty(true);
        }}
      >
        {sortedCalendars.map((calendar) => (
          <Form.TagPicker.Item
            key={calendar.id}
            value={calendar.id}
            title={calendarEntryDisplayName(calendar)}
            icon={{
              source: Icon.Circle,
              tintColor: calendar.backgroundColor || Color.SecondaryText,
            }}
          />
        ))}
      </Form.TagPicker>

      <Form.Separator />

      <Form.Checkbox
        id="onlyMeetings"
        title="Menu Bar Filter"
        label="Only show events with video meetings"
        value={onlyMeetings}
        onChange={setOnlyMeetings}
      />

      <Form.Dropdown
        id="menuBarEventCount"
        title="Events Shown"
        value={menuBarEventCount}
        onChange={setMenuBarEventCount}
      >
        <Form.Dropdown.Item value="5" title="5 events" />
        <Form.Dropdown.Item value="8" title="8 events" />
        <Form.Dropdown.Item value="10" title="10 events" />
        <Form.Dropdown.Item value="12" title="12 events" />
        <Form.Dropdown.Item value="15" title="15 events" />
      </Form.Dropdown>

      <Form.Dropdown
        id="menuBarDateStyle"
        title="Date Format"
        value={menuBarDateStyle}
        onChange={(value) => setMenuBarDateStyle(value as MenuBarDateStyle)}
      >
        <Form.Dropdown.Item
          value="day-month"
          title="UK — DD/MM/YYYY · Wed 14 Sep"
        />
        <Form.Dropdown.Item
          value="month-day"
          title="US — MM/DD/YYYY · Wed Sep 14"
        />
      </Form.Dropdown>

      <Form.Dropdown
        id="menuBarRowLayout"
        title="Event Row Layout"
        value={menuBarRowLayout}
        onChange={(value) => setMenuBarRowLayout(value as MenuBarRowLayout)}
      >
        {(
          [
            "date-time-title",
            "date-title-time",
            "time-date-title",
            "time-title-date",
            "title-date-time",
            "title-time-date",
          ] as MenuBarRowLayout[]
        ).map((layout) => (
          <Form.Dropdown.Item
            key={layout}
            value={layout}
            title={menuBarLayoutExample(layout, menuBarDateStyle)}
          />
        ))}
      </Form.Dropdown>

      <Form.Description
        title="Current Example"
        text={menuBarLayoutExample(menuBarRowLayout, menuBarDateStyle)}
      />

      <Form.Description
        title="Menu Bar Layout"
        text={`Date Format is app-wide: it controls numeric Quick Add input (${menuBarDateStyle === "month-day" ? "09/15" : "15/09"}) as well as menu-bar date display (${menuBarDateExample(menuBarDateStyle)}). Choose how many upcoming rows are shown and arrange Date, Time, and Title in any order. Layout examples deliberately vary the day, month, time, and generic title so each option is easy to scan. Today's date is omitted to keep current-day events compact.`}
      />

      <Form.Description
        title="More Settings"
        text="Schedule range, Google Calendar app, declined-event handling, Calendar Selection Mode, menu-bar visibility, and headline style are available in DayCal's Extension Preferences. Press ⌥⌘, or choose Configure Extension from the Action Panel."
      />
    </Form>
  );
}

export default withAccessToken(googleOAuth)(Command);
