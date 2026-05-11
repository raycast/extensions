import { CalendarEvent, useHACalendarEvents } from "@components/calendar/hooks";
import { CalendarListDropdown } from "@components/calendar/list";
import {
  addDays,
  dateDayName,
  getDateOnly,
  groupEventsByDay,
  humanEventTimeRange,
  sortCalendarEvents,
} from "@components/calendar/utils";
import { getFriendlyName } from "@lib/utils";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";

const now = new Date();

export default function CalendarCommand() {
  const { events, calendars, isLoading, error } = useHACalendarEvents({
    startDatetime: getDateOnly(now),
    endDatetime: addDays(now, 6),
  });
  const [selectedCalendar, setSelectedCalendar] = useCachedState<string>("selected-calendar", "", {
    cacheNamespace: "calendar",
  });
  const [showDetails, setShowDetails] = useCachedState("show-details", false, { cacheNamespace: "calendar" });
  if (error) {
    showFailureToast(error);
  }

  const filteredEvents =
    selectedCalendar && selectedCalendar.length > 0 ? events?.filter((c) => c.entityId === selectedCalendar) : events;

  const friendlyCalendarName = (entityId: string) => {
    const s = calendars?.find((c) => c.entity_id === entityId);
    if (!s) {
      return entityId;
    }
    return getFriendlyName(s);
  };

  const sortedEvents = sortCalendarEvents(filteredEvents);
  const title = (ev: CalendarEvent) => {
    return `${humanEventTimeRange(ev)} | ${ev.summary && ev.summary.trim().length > 0 ? ev.summary.trim() : "?"}`;
  };

  const groupedByDay = groupEventsByDay(sortedEvents);

  const markdown = (event: CalendarEvent) => {
    return [`# ${event.summary}`, "", event.description ?? "<no description>"].join("\n");
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetails}
      searchBarAccessory={
        <CalendarListDropdown calendars={calendars} value={selectedCalendar} onChange={setSelectedCalendar} />
      }
    >
      {groupedByDay.map((d) => (
        <List.Section key={d.day.toISOString()} title={`${dateDayName(d.day)} (${d.day.toLocaleDateString()})`}>
          {d.events?.map((e) => (
            <List.Item
              key={`${e.start}${e.end}${e.summary}`}
              icon={{
                source: Icon.Calendar,
                tintColor: e.calendarColor,
                tooltip: `Calendar: ${friendlyCalendarName(e.entityId)}`,
              }}
              title={title(e)}
              accessories={
                !showDetails
                  ? [
                      {
                        tag:
                          selectedCalendar === ""
                            ? { value: friendlyCalendarName(e.entityId), color: e.calendarColor }
                            : undefined,
                      },
                      { date: new Date(e.start) },
                    ]
                  : undefined
              }
              detail={
                <List.Item.Detail
                  markdown={markdown(e)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Start" text={new Date(e.start).toLocaleString()} />
                      <List.Item.Detail.Metadata.Label title="End" text={new Date(e.end).toLocaleString()} />
                      <List.Item.Detail.Metadata.TagList title="Calendar">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={friendlyCalendarName(e.entityId)}
                          color={e.calendarColor}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={showDetails ? "Hide Details" : "Show Details"}
                    icon={showDetails ? Icon.EyeDisabled : Icon.Eye}
                    onAction={() => setShowDetails(!showDetails)}
                    shortcut={{ modifiers: ["opt"], key: "d" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
