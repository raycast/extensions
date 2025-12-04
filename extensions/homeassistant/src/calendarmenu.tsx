import { CalendarEvent, useHACalendarEvents } from "@components/calendar/hooks";
import {
  addDays,
  calendarEventKey,
  dateDayName,
  getDateOnly,
  groupEventsByDay,
  humanEventTimeRange,
  isAllDayEvent,
  isPastEvent,
  minutesBetweenDates,
  secondsBetweenDates,
  sortCalendarEvents,
} from "@components/calendar/utils";
import { ensureShort, formatToHumanDateTime, getErrorMessage, getFriendlyName } from "@lib/utils";
import { MenuBarExtra as RUIMenuBarExtra } from "@raycast-community/ui";
import { getPreferenceValues, Icon, LaunchType } from "@raycast/api";

const now = new Date();

function maxRootTextLengthPreference() {
  const prefs = getPreferenceValues<Preferences.Calendarmenu>();
  const m = prefs.maxRootTextLength;
  const defaultValue = 10;
  if (!m || m.trim().length <= 0) {
    return defaultValue;
  }
  const num = Number.parseInt(m);
  if (Number.isNaN(num)) {
    return defaultValue;
  }
  return num;
}

export default function MenuCommand() {
  const { events, calendars, isLoading, error } = useHACalendarEvents({
    startDatetime: getDateOnly(now),
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

  const maxRootLength = maxRootTextLengthPreference();

  const nextEvent = sortedEvents?.find(
    (c) =>
      !isAllDayEvent(c) &&
      new Date(c.start).getTime() > now.getTime() &&
      minutesBetweenDates(now, new Date(c.start)) < 60,
  );
  const nextEventMeta = nextEvent
    ? (() => {
        const startDate = new Date(nextEvent.start);
        const isValidDate = !isNaN(startDate.getTime());
        return {
          start: isValidDate ? startDate : undefined,
          humanTimeToEvent: isValidDate ? formatToHumanDateTime(startDate) : "Invalid Date",
          secondsToEvent: isValidDate ? secondsBetweenDates(new Date(), startDate) : undefined,
        };
      })()
    : undefined;

  const groupedByDay = groupEventsByDay(sortedEvents);
  const pastEventHandling = getPreferenceValues<Preferences.Calendarmenu>().pastEventHandling;

  const maxTextLength = 50;

  const nextEventTextTooltip =
    nextEvent && nextEventMeta ? `Upcoming: ${nextEvent.summary} • ${nextEventMeta.humanTimeToEvent}` : undefined;

  return (
    <RUIMenuBarExtra
      icon={{ source: Icon.Calendar, tintColor: nextEvent ? nextEvent.calendarColor : undefined }}
      title={
        maxRootLength > 0 &&
        nextEventMeta &&
        typeof nextEventMeta.secondsToEvent === "number" &&
        nextEventMeta.secondsToEvent < 30 * 60
          ? `${ensureShort(nextEvent?.summary, { max: maxRootLength })} • ${nextEventMeta.humanTimeToEvent}`
          : undefined
      }
      tooltip={nextEventTextTooltip}
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
                  command={{ name: "calendar", type: LaunchType.UserInitiated }}
                  title={`${hidden} more Events`}
                />
              ),
            }}
          >
            {d.events?.map((ev) => {
              const past = isPastEvent(ev);
              if (past && pastEventHandling === "hide") {
                return null;
              }
              return (
                <RUIMenuBarExtra.Item
                  key={`${ev.entityId}${ev.start}${ev.end}${ev.summary}`}
                  title={title(ev)}
                  subtitle={friendlyCalendarName(ev.entityId)}
                  icon={{ source: Icon.Calendar, tintColor: ev.calendarColor }}
                  textLimits={{ maxLength: maxTextLength }}
                  onAction={past && pastEventHandling === "disable" ? undefined : () => {}}
                />
              );
            })}
          </RUIMenuBarExtra.Section>
        ))}
      <RUIMenuBarExtra.Section>
        <RUIMenuBarExtra.ConfigureCommand />
      </RUIMenuBarExtra.Section>
    </RUIMenuBarExtra>
  );
}
