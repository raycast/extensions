import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import {
  addDays,
  differenceInHours,
  endOfDay,
  formatDistance,
  isAfter,
  isBefore,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useEventActions, useEvents } from "./hooks/useEvent";
import { EventActions } from "./hooks/useEvent.types";
import { Event } from "./types/event";
import { eventColors } from "./utils/events";
import { useTask } from "./hooks/useTask";
import { SNOOZE_OPTIONS } from "./consts/tasks.consts";

type EventSection = { section: string; sectionTitle: string; events: Event[] };

const EventActionsList = ({ event }: { event: Event }) => {
  const [eventActions, setEventActions] = useState<EventActions>([]);

  const { getEventActions } = useEventActions();
  const { rescheduleTask } = useTask();

  const loadEventActions = () => {
    const actions = getEventActions(event);
    setEventActions(actions);
  };

  const handleRescheduleTask = async (taskId: string, reschedule: string, startDate?: Date) => {
    await showToast(Toast.Style.Animated, "Rescheduling event...");
    try {
      const task = await rescheduleTask(taskId, reschedule, startDate?.toISOString());

      if (task) {
        showToast(Toast.Style.Success, `Rescheduled"${event.title}" successfully!`);
      } else {
        throw new Error("Rescheduling failed.");
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error while rescheduling",
        message: String(error),
      });
    }
  };

  useEffect(() => {
    void loadEventActions();
  }, []);

  return (
    <ActionPanel>
      {eventActions.map((action) => (
        <Action
          key={action.title}
          title={action.title}
          icon={action.icon}
          onAction={() => {
            action.action();
          }}
        />
      ))}
      {event.reclaimManaged === true && event.assist?.eventType === "TASK_ASSIGNMENT" && (
        <ActionPanel.Submenu title="Snooze Task" icon={Icon.ArrowClockwise}>
          {SNOOZE_OPTIONS.map((option) => (
            <Action
              key={option.title}
              title={option.title}
              onAction={() => {
                handleRescheduleTask(String(event.assist?.taskId), option.value);
              }}
            />
          ))}
        </ActionPanel.Submenu>
      )}
    </ActionPanel>
  );
};

const now = new Date();

const ListSection = ({ events, sectionTitle }: { sectionTitle: string; events: Event[] }) => {
  const { showFormattedEventTitle } = useEventActions();

  return (
    <List.Section title={sectionTitle}>
      {events.map((item, i) => (
        <List.Item
          key={`${i}- ${item.eventId}`}
          title={showFormattedEventTitle(item)}
          icon={{
            tintColor: eventColors[item.color],
            source: Icon.Dot,
          }}
          accessories={[
            {
              text: formatDistance(new Date(item.eventStart), now, {
                addSuffix: true,
              }).replace("about", ""),
            },
            { tag: { value: item.free ? "free" : "busy", color: Color.Blue } },
          ]}
          actions={<EventActionsList event={item} />}
        />
      ))}
    </List.Section>
  );
};

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const now = new Date();

  const { events, isLoading } = useEvents({
    start: startOfDay(now),
    end: addDays(now, 7),
  });

  const eventSections = useMemo<EventSection[]>(() => {
    if (!events) return [];

    const today = startOfDay(now);
    const tomorrow = startOfDay(addDays(now, 1));

    const eventSectionsUnfiltered: EventSection[] = [
      {
        section: "NOW",
        sectionTitle: "Now",
        events: events
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
        sectionTitle: "Today",
        events: events
          .filter((event) => {
            const start = new Date(event.eventStart);
            return isAfter(start, now) && isBefore(start, endOfDay(now));
          })
          .filter((event) => {
            return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
          }),
      },
      {
        section: "EARLIER_TODAY",
        sectionTitle: "Earlier today",
        events: events
          .filter((event) => {
            const end = new Date(event.eventEnd);
            const start = new Date(event.eventStart);
            return isAfter(start, today) && isBefore(end, now);
          })
          .filter((event) => {
            return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
          }),
      },
      {
        section: "TOMORROW",
        sectionTitle: "Tomorrow",
        events: events
          .filter((event) => {
            const start = new Date(event.eventStart);
            return isWithinInterval(start, { start: tomorrow, end: endOfDay(tomorrow) });
          })
          .filter((event) => {
            return !(differenceInHours(new Date(event.eventEnd), new Date(event.eventStart)) >= 24);
          }),
      },
    ];

    return eventSectionsUnfiltered.filter((event) => event.events.length > 0);
  }, [events]);

  return (
    <List
      filtering={true}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="My Calendar"
      searchBarPlaceholder="Search your events"
    >
      {eventSections.map((section) => (
        <ListSection key={section.section} sectionTitle={section.sectionTitle} events={section.events} />
      ))}
    </List>
  );
}
