import {
  List,
  ActionPanel,
  Action,
  Detail,
  Icon,
  Color,
  getPreferenceValues,
  openExtensionPreferences,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { withAccessToken, useCachedPromise } from "@raycast/utils";
import { useState, useMemo, useEffect } from "react";
import { google } from "./oauth";
import {
  fetchCalendars,
  fetchUpcomingAllDayEvents,
  fetchPastAllDayEvents,
} from "./google-calendar";
import { getSelectedCalendarIds } from "./storage";
import { AllDayEvent, GoogleCalendar, DisplayMode } from "./types";
import { formatCountdown, formatDate, nextDisplayMode } from "./utils";

function Days2Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [globalDisplayMode] = useState<DisplayMode>(
    preferences.displayMode ?? "days",
  );
  const [perEventMode, setPerEventMode] = useState<Record<string, DisplayMode>>(
    {},
  );
  const [calendarFilter, setCalendarFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");

  // Fetch calendar list
  const {
    data: calendars,
    isLoading: calendarsLoading,
    error: calendarsError,
  } = useCachedPromise(fetchCalendars, [], {
    keepPreviousData: true,
  });

  // Get selected calendar IDs
  const {
    data: selectedIds,
    isLoading: selectedIdsLoading,
    error: selectedIdsError,
  } = useCachedPromise(
    async (cals: GoogleCalendar[] | undefined) => {
      if (!cals) return [];
      const stored = await getSelectedCalendarIds();
      return stored ?? cals.map((c) => c.id);
    },
    [calendars],
    { execute: !!calendars },
  );

  const calendarMap = useMemo(() => {
    const map = new Map<string, GoogleCalendar>();
    for (const cal of calendars ?? []) {
      map.set(cal.id, cal);
    }
    return map;
  }, [calendars]);

  // Fetch upcoming events
  const {
    data: upcomingEvents,
    isLoading: eventsLoading,
    error: upcomingError,
  } = useCachedPromise(
    fetchUpcomingAllDayEvents,
    [selectedIds ?? [], calendarMap],
    {
      execute: !!selectedIds && selectedIds.length > 0 && calendarMap.size > 0,
    },
  );

  // Fetch past events (only when searching)
  const {
    data: pastEvents,
    isLoading: pastEventsLoading,
    error: pastError,
  } = useCachedPromise(
    fetchPastAllDayEvents,
    [selectedIds ?? [], calendarMap],
    { execute: !!searchText && !!selectedIds && selectedIds.length > 0 },
  );

  const isLoading =
    calendarsLoading ||
    selectedIdsLoading ||
    eventsLoading ||
    (!!searchText && pastEventsLoading);

  useEffect(() => {
    if (calendarsError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch calendars",
        message: String(calendarsError),
      });
    }
  }, [calendarsError]);

  useEffect(() => {
    if (selectedIdsError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to read selected calendars",
        message: String(selectedIdsError),
      });
    }
  }, [selectedIdsError]);

  useEffect(() => {
    if (upcomingError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch upcoming events",
        message: String(upcomingError),
      });
    }
  }, [upcomingError]);

  useEffect(() => {
    if (pastError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch past events",
        message: String(pastError),
      });
    }
  }, [pastError]);

  // Filter by calendar dropdown
  const filteredUpcoming = useMemo(() => {
    if (!upcomingEvents) return [];
    if (calendarFilter === "all") return upcomingEvents;
    return upcomingEvents.filter((e) => e.calendarId === calendarFilter);
  }, [upcomingEvents, calendarFilter]);

  const filteredPast = useMemo(() => {
    if (!pastEvents) return [];
    if (calendarFilter === "all") return pastEvents;
    return pastEvents.filter((e) => e.calendarId === calendarFilter);
  }, [pastEvents, calendarFilter]);

  const heroEvent =
    !searchText && filteredUpcoming.length > 0 ? filteredUpcoming[0] : null;
  const remainingUpcoming = heroEvent
    ? filteredUpcoming.slice(1)
    : filteredUpcoming;

  function getEventDisplayMode(eventId: string): DisplayMode {
    return perEventMode[eventId] ?? globalDisplayMode;
  }

  function toggleEventDisplayMode(eventId: string, daysUntil: number) {
    setPerEventMode((prev) => {
      const current = prev[eventId] ?? globalDisplayMode;
      return {
        ...prev,
        [eventId]: nextDisplayMode(current, daysUntil),
      };
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Events"
      onSearchTextChange={setSearchText}
      filtering={true}
      searchBarAccessory={
        <CalendarDropdown
          calendars={calendars ?? []}
          selectedIds={selectedIds ?? []}
          onCalendarChange={setCalendarFilter}
        />
      }
    >
      {heroEvent && (
        <List.Section title="Next Event">
          <EventListItem
            event={heroEvent}
            displayMode={getEventDisplayMode(heroEvent.id)}
            onToggleDisplayMode={() =>
              toggleEventDisplayMode(heroEvent.id, heroEvent.daysUntil)
            }
            isHero={true}
          />
        </List.Section>
      )}

      {remainingUpcoming.length > 0 && (
        <List.Section
          title="Upcoming"
          subtitle={`${remainingUpcoming.length} events`}
        >
          {remainingUpcoming.map((event) => (
            <EventListItem
              key={`${event.calendarId}-${event.id}`}
              event={event}
              displayMode={getEventDisplayMode(event.id)}
              onToggleDisplayMode={() =>
                toggleEventDisplayMode(event.id, event.daysUntil)
              }
            />
          ))}
        </List.Section>
      )}

      {searchText && filteredPast.length > 0 && (
        <List.Section
          title="Past Events"
          subtitle={`${filteredPast.length} events`}
        >
          {filteredPast.map((event) => (
            <EventListItem
              key={`past-${event.calendarId}-${event.id}`}
              event={event}
              displayMode={getEventDisplayMode(event.id)}
              onToggleDisplayMode={() =>
                toggleEventDisplayMode(event.id, event.daysUntil)
              }
            />
          ))}
        </List.Section>
      )}

      {!isLoading && filteredUpcoming.length === 0 && (
        <List.EmptyView
          title="No Upcoming Events"
          description="No all-day events found in your selected calendars"
          icon={Icon.Calendar}
        />
      )}
    </List>
  );
}

function CalendarDropdown(props: {
  calendars: GoogleCalendar[];
  selectedIds: string[];
  onCalendarChange: (calId: string) => void;
}) {
  const visibleCalendars = props.calendars.filter((c) =>
    props.selectedIds.includes(c.id),
  );

  return (
    <List.Dropdown
      tooltip="Filter by Calendar"
      storeValue={true}
      onChange={props.onCalendarChange}
    >
      <List.Dropdown.Item title="All Calendars" value="all" />
      <List.Dropdown.Section title="Calendars">
        {visibleCalendars.map((cal) => (
          <List.Dropdown.Item
            key={cal.id}
            title={cal.summary}
            value={cal.id}
            icon={{ source: Icon.Calendar, tintColor: cal.backgroundColor }}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function EventListItem(props: {
  event: AllDayEvent;
  displayMode: DisplayMode;
  onToggleDisplayMode: () => void;
  isHero?: boolean;
}) {
  const { event, displayMode, onToggleDisplayMode, isHero } = props;
  const countdownText = formatCountdown(event.daysUntil, displayMode);

  const accessories: List.Item.Accessory[] = [
    {
      text: { value: formatDate(event.startDate), color: Color.SecondaryText },
    },
  ];
  if (isHero) {
    accessories.push({
      tag: { value: countdownText, color: Color.PrimaryText },
    });
  } else {
    accessories.push({
      text: { value: countdownText, color: Color.SecondaryText },
    });
  }

  return (
    <List.Item
      title={event.title}
      subtitle={event.calendarName}
      icon={event.description ? Icon.Document : Icon.Calendar}
      keywords={[event.calendarName, event.startDate]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Toggle Display Mode"
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              onAction={onToggleDisplayMode}
            />
            <Action.OpenInBrowser
              title="Open in Google Calendar"
              url={event.htmlLink}
              shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
            />
            {event.description && (
              <Action.Push
                title="Show Description"
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                target={<EventDescription event={event} />}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
            <Action
              title="Manage Calendars"
              icon={Icon.List}
              onAction={async () => {
                try {
                  await launchCommand({
                    name: "manage-calendars",
                    type: LaunchType.UserInitiated,
                  });
                } catch (e) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Unable to open Manage Calendars",
                    message: String(e),
                  });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function EventDescription(props: { event: AllDayEvent }) {
  const { event } = props;
  const markdown = `# ${event.title}\n\n**Calendar:** ${event.calendarName}  \n**Date:** ${formatDate(event.startDate)}\n\n---\n\n${event.description ?? "No description."}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Google Calendar"
            url={event.htmlLink}
          />
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken(google)(Days2Command);
