import { CalendarEvent, useHACalendarEvents } from "@components/calendar/hooks";
import {
  addDays,
  CalendarState,
  dateDayName,
  groupEventsByDay,
  humanEventTimeRange,
  sortCalendarEvents,
} from "@components/calendar/utils";
import { getFriendlyName } from "@lib/utils";
import { Icon, List } from "@raycast/api";
import { showFailureToast, useCachedState } from "@raycast/utils";

interface CalendarListDropdownProps extends Omit<List.Dropdown.Props, "tooltip"> {
  calendars: CalendarState[] | undefined;
}

function CalendarListDropdown({ calendars, ...restProps }: CalendarListDropdownProps) {
  return (
    <List.Dropdown tooltip="Calendars" {...restProps}>
      <List.Dropdown.Section>
        <List.Dropdown.Item title="All" value="" icon={Icon.Calendar} />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Calendars">
        {calendars?.map((c) => (
          <List.Dropdown.Item
            key={c.entity_id}
            title={getFriendlyName(c)}
            value={c.entity_id}
            icon={{ source: Icon.Calendar, tintColor: c.color }}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

const now = new Date();

export default function CalendarCommand() {
  const { events, calendars, isLoading, error } = useHACalendarEvents({
    startDatetime: now,
    endDatetime: addDays(now, 6),
  });
  const [selectedCalendar, setSelectedCalendar] = useCachedState<string>("selected-calendar");
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

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <CalendarListDropdown calendars={calendars} value={selectedCalendar} onChange={setSelectedCalendar} />
      }
    >
      {groupedByDay.map((d) => (
        <List.Section key={d.day.toISOString()} title={`${dateDayName(d.day)} (${d.day.toLocaleDateString()})`}>
          {d.events?.map((e) => (
            <List.Item
              key={`${e.start}${e.end}${e.summary}`}
              icon={{ source: Icon.Calendar, tintColor: e.calendarColor }}
              title={title(e)}
              accessories={[{ tag: { value: friendlyCalendarName(e.entityId), color: e.calendarColor } }]}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
