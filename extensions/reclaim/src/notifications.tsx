import { Icon, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  addDays,
  addMinutes,
  differenceInHours,
  endOfDay,
  format,
  formatDistance,
  isAfter,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { useMemo } from "react";
import { useEvent } from "./hooks/useEvent";
import { ApiResponseEvents } from "./hooks/useEvent.types";
import { Event } from "./types/event";
import { NativePreferences } from "./types/preferences";
import { sortEvents } from "./utils/arrays";
import { miniDuration } from "./utils/dates";
import { eventColors, truncateEventSize } from "./utils/events";
import { parseEmojiField } from "./utils/string";

type EventSection = { section: string; sectionTitle: string; events: Event[] };

const GRACE_PERIOD = 5;

const ActionOptionsWithContext = ({ event }: { event: Event }) => {
  const { getEventActions } = useEvent();

  return (
    <>
      {getEventActions(event).map((action) => (
        <MenuBarExtra.Item key={action.title} title={action.title} onAction={action.action} />
      ))}
    </>
  );
};

const EventsSection = ({ events, sectionTitle }: { events: Event[]; sectionTitle: string }) => {
  const { showFormattedEventTitle } = useEvent();

  return (
    <>
      <MenuBarExtra.Section title={sectionTitle} />
      {events.map((event) => (
        <MenuBarExtra.Submenu
          key={event.eventId}
          icon={{
            source: Icon.Dot,
            tintColor: eventColors[event.color],
          }}
          title={showFormattedEventTitle(event, true)}
        >
          <ActionOptionsWithContext event={event} />
        </MenuBarExtra.Submenu>
      ))}
    </>
  );
};

export default function Command() {
  const { apiToken, apiUrl, upcomingEventsCount } = getPreferenceValues<NativePreferences>();

  const NUMBER_OF_EVENTS = Number(upcomingEventsCount) || 5;

  const fetchHeaders = {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const range = {
    start: format(startOfDay(new Date()), "yyyy-MM-dd"),
    end: format(addDays(new Date(), 2), "yyyy-MM-dd"),
  };

  const { data, isLoading } = useFetch<ApiResponseEvents>(
    `${apiUrl}/events?sourceDetails=true&start=${range.start}&end=${range.end}`,
    {
      headers: fetchHeaders,
      keepPreviousData: true,
    }
  );

  const events = useMemo<EventSection[]>(() => {
    if (!data) return [];

    const now = new Date();
    const today = startOfDay(now);

    const events: EventSection[] = [
      {
        section: "NOW",
        sectionTitle: "Now",
        events: data
          .filter((event) => {
            return event.reclaimEventType !== "CONF_BUFFER" && event.reclaimEventType !== "TRAVEL_BUFFER";
          })
          .filter((event) => {
            const start = new Date(event.eventStart);
            const end = new Date(event.eventEnd);
            return isWithinInterval(now, { start, end });
          })
          .filter((event) => {
            return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
          }),
      },
      {
        section: "TODAY",
        sectionTitle: "Upcoming events",
        events: data
          .filter((event) => {
            return event.reclaimEventType !== "CONF_BUFFER" && event.reclaimEventType !== "TRAVEL_BUFFER";
          })
          .filter((event) => {
            const start = new Date(event.eventStart);
            return isWithinInterval(start, { start: now, end: endOfDay(today) });
          })
          .filter((event) => {
            return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
          })
          .slice(0, NUMBER_OF_EVENTS),
      },
    ];

    return events.filter((event) => event.events.length > 0);
  }, [data]);

  const handleOpenReclaim = () => {
    open("https://app.reclaim.ai");
  };

  const handleOpenRaycast = async () => {
    await launchCommand({ name: "my-calendar", type: LaunchType.UserInitiated });
  };

  const title = useMemo(() => {
    const now = new Date();
    const NO_EVENTS_STR = "No upcoming events";

    const notEndedEvents = data
      ?.filter((event) => {
        const end = new Date(event.eventEnd);
        return isAfter(end, now);
      })
      .filter((event) => {
        return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
      })
      .sort(sortEvents);

    if (!notEndedEvents?.length) return NO_EVENTS_STR;

    const hasEventsNow = notEndedEvents.filter((event) => {
      const start = new Date(event.eventStart);
      const end = addMinutes(new Date(event.eventStart), GRACE_PERIOD);
      return isWithinInterval(now, { start, end });
    });

    if (hasEventsNow.length > 0) {
      const evNow = hasEventsNow[hasEventsNow.length - 1];
      const realEventTitle = evNow.sourceDetails?.title || evNow.title;
      return `Now: ${truncateEventSize(parseEmojiField(realEventTitle).textWithoutEmoji)}`;
    }

    const nextEvents = notEndedEvents
      .filter((event) => {
        const start = new Date(event.eventStart);
        return isAfter(start, now);
      })
      .filter((event) => {
        const start = new Date(event.eventStart);
        const end = new Date(event.eventEnd);
        return !isWithinInterval(now, { start, end });
      })
      .filter((event) => {
        const start = new Date(event.eventStart);
        return isWithinInterval(start, { start: now, end: endOfDay(now) });
      })
      .sort(sortEvents);

    if (!nextEvents.length) return NO_EVENTS_STR;

    const evNext = nextEvents[0];
    const realEventTitle = evNext.sourceDetails?.title || evNext.title;

    return `Next: ${truncateEventSize(parseEmojiField(realEventTitle).textWithoutEmoji)} ${miniDuration(
      formatDistance(new Date(nextEvents[0].eventStart), now, {
        addSuffix: true,
      })
    )}`;
  }, [data]);

  return (
    <MenuBarExtra isLoading={isLoading} icon={"command-icon.png"} title={title} tooltip="test">
      {events.map((eventSection) => (
        <EventsSection
          key={eventSection.section}
          events={eventSection.events}
          sectionTitle={eventSection.sectionTitle}
        />
      ))}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Open Reclaim" onAction={handleOpenReclaim} />
      <MenuBarExtra.Item title="Open Raycast" onAction={handleOpenRaycast} />
    </MenuBarExtra>
  );
}
