import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { withAccessToken, useCachedPromise } from "@raycast/utils";
import { useState, useCallback } from "react";
import { google } from "./oauth";
import { fetchCalendars } from "./google-calendar";
import {
  getSelectedCalendarIds,
  toggleCalendarSelection,
  setSelectedCalendarIds,
} from "./storage";
import { GoogleCalendar } from "./types";

function ManageCalendarsCommand() {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: calendars, isLoading: calendarsLoading } = useCachedPromise(
    fetchCalendars,
    [],
    {
      keepPreviousData: true,
    },
  );

  const { data: selectedIds, isLoading: selectedLoading } = useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (cals: GoogleCalendar[] | undefined, _key: number) => {
      if (!cals) return [];
      const stored = await getSelectedCalendarIds();
      return stored ?? cals.map((c) => c.id);
    },
    [calendars, refreshKey],
    { execute: !!calendars },
  );

  const handleToggle = useCallback(
    async (calendarId: string) => {
      if (!calendars) return;
      await toggleCalendarSelection(
        calendarId,
        calendars.map((c) => c.id),
      );
      setRefreshKey((k) => k + 1);
    },
    [calendars],
  );

  const handleSelectAll = useCallback(async () => {
    if (!calendars) return;
    await setSelectedCalendarIds(calendars.map((c) => c.id));
    setRefreshKey((k) => k + 1);
  }, [calendars]);

  const handleDeselectAll = useCallback(async () => {
    if (!calendars || calendars.length === 0) return;
    const primary = calendars.find((c) => c.primary);
    await setSelectedCalendarIds(primary ? [primary.id] : [calendars[0].id]);
    setRefreshKey((k) => k + 1);
  }, [calendars]);

  const isLoading = calendarsLoading || selectedLoading;
  const selectedSet = new Set(selectedIds ?? []);
  const allSelected =
    calendars !== undefined &&
    calendars.length > 0 &&
    selectedSet.size === calendars.length;

  return (
    <List isLoading={isLoading} navigationTitle="Manage Calendars">
      <List.Section>
        <List.Item
          title={allSelected ? "Deselect All" : "Select All"}
          icon={allSelected ? Icon.Circle : Icon.CheckCircle}
          actions={
            <ActionPanel>
              <Action
                title={allSelected ? "Deselect All" : "Select All"}
                icon={allSelected ? Icon.Circle : Icon.CheckCircle}
                onAction={allSelected ? handleDeselectAll : handleSelectAll}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section
        title="Google Calendars"
        subtitle={`${selectedSet.size} selected`}
      >
        {(calendars ?? []).map((cal) => {
          const isSelected = selectedSet.has(cal.id);
          return (
            <List.Item
              key={cal.id}
              title={cal.summary}
              subtitle={cal.description ?? undefined}
              icon={{
                source: isSelected ? Icon.CheckCircle : Icon.Circle,
                tintColor: cal.backgroundColor ?? Color.PrimaryText,
              }}
              accessories={[
                ...(cal.primary
                  ? [{ tag: { value: "Primary", color: Color.Blue } }]
                  : []),
                { text: isSelected ? "Selected" : "" },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? "Deselect Calendar" : "Select Calendar"}
                    icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => handleToggle(cal.id)}
                  />
                  <Action
                    title="Select All"
                    icon={Icon.CheckCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                    onAction={handleSelectAll}
                  />
                  <Action
                    title="Deselect All"
                    icon={Icon.Circle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                    onAction={handleDeselectAll}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default withAccessToken(google)(ManageCalendarsCommand);
