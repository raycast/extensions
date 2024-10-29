import "./initSentry";

import { LaunchType, MenuBarExtra, getPreferenceValues, launchCommand, open } from "@raycast/api";
import {
  addDays,
  differenceInMinutes,
  differenceInHours,
  endOfDay,
  formatDistance,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { useMemo } from "react";
import { MenuBarEventSection } from "./components/MenuBarEventSection";
import { useCallbackSafeRef } from "./hooks/useCallbackSafeRef";
import { useEvents } from "./hooks/useEvent";
import { useMoment } from "./hooks/useMoment";
import { useUser } from "./hooks/useUser";
import { Event } from "./types/event";
import { NativePreferences } from "./types/preferences";
import { miniDuration } from "./utils/dates";
import { getOriginalEventIDFromSyncEvent, truncateEventSize } from "./utils/events";
import { stripPlannerEmojis } from "./utils/string";
import { withRAIErrorBoundary } from "./components/RAIErrorBoundary";

type EventSection = { section: string; sectionTitle: string; events: Event[] };

type TitleInfo = {
  minTitle: string;
  fullTitle: string;
  event: Event | null;
  nowOrNext: "NOW" | "NEXT" | "NONE";
};

function Command() {
  /********************/
  /*   custom hooks   */
  /********************/

  const { upcomingEventsCount } = getPreferenceValues<NativePreferences>();

  const { currentUser } = useUser();

  const now = new Date();

  const { events, isLoading: isLoadingEvents } = useEvents({
    start: startOfDay(now),
    end: addDays(now, 2),
  });

  const { momentData, isLoading: isLoadingMoment } = useMoment();

  /********************/
  /* useMemo & consts */
  /********************/

  const NUMBER_OF_EVENTS = Number(upcomingEventsCount) || 5;

  // if the events returned by moment/next are synced events then return the original event from the events call if it exists
  const eventMoment = useMemo(() => {
    if (!momentData) return momentData;

    const findEvent = (event: Event | undefined | null) => {
      if (!event || !events || events.length === 0) return event;

      const originalEventID = getOriginalEventIDFromSyncEvent(event);
      if (!originalEventID) return event;

      return events.find((e) => e.eventId === originalEventID) ?? event;
    };

    const { event } = momentData;

    return {
      event: findEvent(event),
    };
  }, [momentData, events]);

  const showDeclinedEvents = useMemo(() => {
    return !!currentUser?.settings.showDeclinedEvents;
  }, [currentUser]);

  const eventSections = useMemo<EventSection[]>(() => {
    if (!events) return [];

    const now = new Date();
    const today = startOfDay(now);

    const eventSectionsUnfiltered: EventSection[] = [
      {
        section: "NOW",
        sectionTitle: "Now",
        events: events
          .filter((event) => {
            return showDeclinedEvents ? true : event.rsvpStatus !== "Declined" && event.rsvpStatus !== "NotResponded";
          })
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
        events: events
          .filter((event) => {
            return showDeclinedEvents ? true : event.rsvpStatus !== "Declined" && event.rsvpStatus !== "NotResponded";
          })
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

    return eventSectionsUnfiltered.filter((event) => event.events.length > 0);
  }, [events, showDeclinedEvents]);

  const titleInfo = useMemo<TitleInfo>(() => {
    const now = new Date();
    let eventNextNow;
    const showNowEvent = getPreferenceValues()["showNowEvent"];
    if (showNowEvent) {
      const nowEvent = events?.filter((event) => {
        const start = new Date(event.eventStart);
        const end = new Date(event.eventEnd);
        return isWithinInterval(now, { start, end });
      });

      const recentNowEvent = nowEvent?.find((event) => differenceInMinutes(now, new Date(event.eventStart)) <= 5);

      if (recentNowEvent) {
        eventNextNow = recentNowEvent;
      } else if (eventMoment?.event) {
        eventNextNow = eventMoment.event;
      } else if (nowEvent?.length) {
        eventNextNow = nowEvent[0];
      }
    } else {
      eventNextNow = eventMoment?.event;
    }

    if (eventNextNow) {
      const realEventTitle = eventNextNow.sourceDetails?.title || eventNextNow.title;
      const eventStart = new Date(eventNextNow.eventStart);
      const eventEnd = new Date(eventNextNow.eventEnd);

      const isNow = isWithinInterval(new Date(), { start: eventStart, end: eventEnd });

      const eventString = stripPlannerEmojis(realEventTitle);
      const miniEventString = truncateEventSize(eventString);

      const distanceString = miniDuration(
        formatDistance(new Date(eventStart), now, {
          addSuffix: true,
        })
      );

      return isNow
        ? {
            event: eventNextNow,
            fullTitle: `Now: ${eventString}`,
            minTitle: `Now: ${miniEventString}`,
            nowOrNext: "NOW",
          }
        : {
            event: eventNextNow,
            fullTitle: `Next: ${eventString} ${distanceString}`,
            minTitle: `Next: ${miniEventString} ${distanceString}`,
            nowOrNext: "NEXT",
          };
    }

    return {
      fullTitle: "No upcoming events",
      minTitle: "No upcoming events",
      nowOrNext: "NONE",
      event: null,
    };
  }, [eventMoment, events]);

  /********************/
  /*    useCallback   */
  /********************/

  const handleOpenReclaim = useCallbackSafeRef(() => {
    open("https://app.reclaim.ai");
  });

  const handleOpenRaycast = useCallbackSafeRef(async () => {
    await launchCommand({ name: "my-calendar", type: LaunchType.UserInitiated });
  });

  /********************/
  /*       JSX        */
  /********************/

  return (
    <MenuBarExtra
      isLoading={isLoadingEvents || isLoadingMoment}
      icon={"command-icon.png"}
      title={titleInfo.minTitle}
      tooltip={titleInfo.fullTitle}
    >
      {eventSections.map((eventSection) => (
        <MenuBarEventSection
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

export default withRAIErrorBoundary(Command);
