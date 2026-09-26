import { withAccessToken } from "@raycast/utils";
import { googleOAuth } from "./lib/google-oauth";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchType,
  List,
  Toast,
  getPreferenceValues,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarSelectionMode,
  allReadableCalendarIds,
  calendarEntryDisplayName,
  getMenuBarEnabledCalendarIds,
  getScheduleEnabledCalendarIds,
  googleVisibleCalendarIds,
  setMenuBarEnabledCalendarIds,
  setScheduleEnabledCalendarIds,
} from "./lib/calendar-settings";
import { listCalendars } from "./lib/google";
import { GoogleCalendarEntry } from "./lib/types";

interface Preferences {
  calendarSelectionMode: CalendarSelectionMode;
}

type CalendarTarget = "schedule" | "menu-bar";

function targetLabel(target: CalendarTarget): string {
  return target === "schedule" ? "Schedule" : "Menu Bar";
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

function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarEntry[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState<Set<string>>(
    new Set<string>(),
  );
  const [menuBarEnabled, setMenuBarEnabled] = useState<Set<string>>(
    new Set<string>(),
  );
  const [target, setTarget] = useState<CalendarTarget>("schedule");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allCalendars = (await listCalendars()).filter(
        (calendar) => calendar.accessRole !== "none",
      );
      const [storedSchedule, storedMenuBar] = await Promise.all([
        getScheduleEnabledCalendarIds(),
        getMenuBarEnabledCalendarIds(),
      ]);
      const defaultIds = googleVisibleCalendarIds(allCalendars);

      setCalendars(allCalendars);
      setScheduleEnabled(new Set<string>(storedSchedule ?? defaultIds));
      setMenuBarEnabled(new Set<string>(storedMenuBar ?? defaultIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
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

  const activeEnabled =
    target === "schedule" ? scheduleEnabled : menuBarEnabled;

  async function persist(next: Set<string>, destination: CalendarTarget) {
    const copy = new Set(next);
    if (destination === "schedule") {
      setScheduleEnabled(copy);
      await setScheduleEnabledCalendarIds(Array.from(copy));
      return;
    }

    setMenuBarEnabled(copy);
    await setMenuBarEnabledCalendarIds(Array.from(copy));

    // The menu-bar cache is account-scoped, so don't try to remove an old
    // hard-coded cache key here. Ask the menu-bar command to perform a full
    // refresh against the current account instead.
    void refreshMenuBar();
  }

  async function toggle(calendarId: string, destination: CalendarTarget) {
    const current =
      destination === "schedule" ? scheduleEnabled : menuBarEnabled;
    const next = new Set(current);
    if (next.has(calendarId)) next.delete(calendarId);
    else next.add(calendarId);
    await persist(next, destination);
  }

  async function useGoogleVisibility() {
    const ids = googleVisibleCalendarIds(calendars);
    await persist(new Set<string>(ids), target);
    await showToast({
      style: Toast.Style.Success,
      title: `${targetLabel(target)} matched Google visibility`,
    });
  }

  async function enableAll() {
    await persist(new Set<string>(allReadableCalendarIds(calendars)), target);
    await showToast({
      style: Toast.Style.Success,
      title: `All ${targetLabel(target).toLowerCase()} calendars enabled`,
    });
  }

  async function disableAll() {
    await persist(new Set<string>(), target);
    await showToast({
      style: Toast.Style.Success,
      title: `All ${targetLabel(target).toLowerCase()} calendars disabled`,
    });
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not load calendars"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={load}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const modeLabel =
    preferences.calendarSelectionMode === "custom"
      ? "Custom selection is active"
      : preferences.calendarSelectionMode === "google"
        ? "Google Calendar visibility mode is active"
        : "All Calendars mode is active";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${targetLabel(target).toLowerCase()} calendars…`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Choose calendar list"
          value={target}
          onChange={(value) => setTarget(value as CalendarTarget)}
        >
          <List.Dropdown.Item title="Schedule" value="schedule" />
          <List.Dropdown.Item title="Menu Bar" value="menu-bar" />
        </List.Dropdown>
      }
    >
      <List.Section
        title={`${targetLabel(target)} Calendars`}
        subtitle={`${modeLabel} · Enter toggles this calendar for ${targetLabel(target)}`}
      >
        {sorted.map((calendar) => {
          const isScheduleEnabled = scheduleEnabled.has(calendar.id);
          const isMenuBarEnabled = menuBarEnabled.has(calendar.id);
          const isEnabled = activeEnabled.has(calendar.id);
          const name = calendarEntryDisplayName(calendar);
          const access = calendar.primary
            ? "Primary"
            : calendar.accessRole === "owner" ||
                calendar.accessRole === "writer"
              ? "Writable"
              : "Read-only";

          const accessories: List.Item.Accessory[] = [];
          if (isScheduleEnabled) {
            accessories.push({
              tag: "Schedule",
              tooltip: "Enabled in Schedule",
            });
          }
          if (isMenuBarEnabled) {
            accessories.push({
              tag: "Menu Bar",
              tooltip: "Enabled in the menu bar",
            });
          }

          const otherTarget: CalendarTarget =
            target === "schedule" ? "menu-bar" : "schedule";
          const otherEnabled =
            otherTarget === "schedule" ? isScheduleEnabled : isMenuBarEnabled;

          return (
            <List.Item
              key={calendar.id}
              title={name}
              subtitle={access}
              icon={{
                source: Icon.Circle,
                tintColor: calendar.backgroundColor || Color.SecondaryText,
              }}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action
                    title={`${isEnabled ? "Disable" : "Enable"} in ${targetLabel(target)}`}
                    icon={isEnabled ? Icon.Circle : Icon.Checkmark}
                    onAction={() => toggle(calendar.id, target)}
                  />
                  <Action
                    title={`${otherEnabled ? "Disable" : "Enable"} in ${targetLabel(otherTarget)}`}
                    icon={otherEnabled ? Icon.Circle : Icon.Checkmark}
                    onAction={() => toggle(calendar.id, otherTarget)}
                  />
                  <ActionPanel.Section
                    title={`${targetLabel(target)} Selection`}
                  >
                    <Action
                      title="Use Google Visibility"
                      icon={Icon.ArrowClockwise}
                      onAction={useGoogleVisibility}
                    />
                    <Action
                      title="Enable All"
                      icon={Icon.Checkmark}
                      onAction={enableAll}
                    />
                    <Action
                      title="Disable All"
                      icon={Icon.Circle}
                      onAction={disableAll}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="DayCal">
                    <Action
                      title="Open Extension Settings"
                      icon={Icon.Gear}
                      onAction={openExtensionPreferences}
                    />
                    <Action
                      title="Refresh Calendars"
                      icon={Icon.ArrowClockwise}
                      onAction={load}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default withAccessToken(googleOAuth)(Command);
