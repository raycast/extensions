import { CalendarEvent, useHACalendarEvents } from "@components/calendar/hooks";
import {
  addDays,
  calendarEventKey,
  dateDayName,
  groupEventsByDay,
  humanEventTimeRange,
  isAllDayEvent,
  minutesBetweenDates,
  secondsBetweenDates,
  sortCalendarEvents,
} from "@components/calendar/utils";
import { Icon, LaunchType } from "@raycast/api";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";
import { formatToHumanDateTime, getErrorMessage, getFriendlyName } from "@lib/utils";

const now = new Date();

export default function MenuCommand() {
  const { events, calendars, isLoading, error } = useHACalendarEvents({
    startDatetime: now,
    endDatetime: addDays(now, 1),
  });
  const friendlyCalendarName = (entityId: string) => {
    const s = calendars?.find((c) => c.entity_id === entityId);
    if (!s) {
      return entityId;
    }
    return getFriendlyName(s);
  };
  const sortedEvents = sortCalendarEvents(events);
  const title = (ev: CalendarEvent) => {
    return `${humanEventTimeRange(ev)} | ${ev.summary && ev.summary.trim().length > 0 ? ev.summary.trim() : "?"}`;
  };

  const nextEvent = sortedEvents?.find(
    (c) =>
      !isAllDayEvent(c) &&
      new Date(c.start).getTime() > now.getTime() &&
      minutesBetweenDates(now, new Date(c.start)) < 60,
  );
  const nextEventMeta = nextEvent
    ? {
        start: new Date(nextEvent.start),
        humanTimeToEvent: formatToHumanDateTime(new Date(nextEvent.start) ?? ""),
        secondsToEvent: secondsBetweenDates(new Date(), new Date(nextEvent.start)),
      }
    : undefined;

  const groupedByDay = groupEventsByDay(sortedEvents);

  const maxTextLength = 50;

  return (
    <RUIMenuBarExtra
      icon={{ source: Icon.Calendar, tintColor: nextEvent ? nextEvent.calendarColor : undefined }}
      title={
        nextEventMeta && nextEventMeta.secondsToEvent < 30 * 60
          ? `${nextEvent?.summary.slice(0, 10)}${nextEvent && nextEvent?.summary.length > 10 ? "..." : ""} • ${nextEventMeta.humanTimeToEvent}`
          : undefined
      }
      isLoading={isLoading}
    >
      {error && (
        <RUIMenuBarExtra.Item
          key="error"
          title="Error"
          subtitle={getErrorMessage(error)}
          textLimits={{ maxLength: maxTextLength }}
        />
      )}
      {!error && (
        <RUIMenuBarExtra.Section title="Upcoming">
          {nextEvent && (
            <RUIMenuBarExtra.Item
              key={calendarEventKey(nextEvent)}
              title={`${nextEventMeta?.humanTimeToEvent} • ${nextEvent.summary}`}
              subtitle={friendlyCalendarName(nextEvent.entityId)}
              icon={{ source: Icon.Calendar, tintColor: nextEvent.calendarColor }}
              onAction={() => {}}
            />
          )}
        </RUIMenuBarExtra.Section>
      )}
      {!error &&
        groupedByDay.map((d) => (
          <RUIMenuBarExtra.Section
            key={dateDayName(d.day)}
            title={`${dateDayName(d.day)} (${d.day.toLocaleDateString()})`}
            childrenLimit={{
              max: 10,
              moreElement: (hidden) => (
                <RUIMenuBarExtra.LaunchCommand
                  command={{ name: "calendars", type: LaunchType.UserInitiated }}
                  title={`${hidden} more Events`}
                />
              ),
            }}
          >
            {d.events?.map((ev) => (
              <RUIMenuBarExtra.Item
                key={`${ev.entityId}${ev.start}${ev.end}${ev.summary}`}
                title={title(ev)}
                subtitle={friendlyCalendarName(ev.entityId)}
                icon={{ source: Icon.Calendar, tintColor: ev.calendarColor }}
                textLimits={{ maxLength: maxTextLength }}
                onAction={() => {}}
              />
            ))}
          </RUIMenuBarExtra.Section>
        ))}
      <RUIMenuBarExtra.Section>
        <RUIMenuBarExtra.ConfigureCommand />
      </RUIMenuBarExtra.Section>
    </RUIMenuBarExtra>
  );
}
