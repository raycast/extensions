import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { runAppleScript, useCachedPromise, useCachedState } from "@raycast/utils";
import { formatDate } from "date-fns";
import pMinDelay from "p-min-delay";
import { useState } from "react";

interface CalendarEvent {
  title: string;
  startDate: Date | string;
  endDate: Date | string;
}

async function getCalendars() {
  const result = await runAppleScript(`
    set output to ""
      tell application "Calendar"
      set output to name of calendars where writable is true
      end tell
    return output
  `);
  return result.split(",").map((name) => ({ name: name.trim() }));
}

async function addEventsToCalendar(calendar: string, events: CalendarEvent[]) {
  const toast = await showToast({
    title: `Adding event${events.length > 1 ? "s" : ""} to ${calendar}`,
    style: Toast.Style.Animated,
    message: events.length > 1 ? `${events.length} events` : events[0].title,
  });

  await pMinDelay(
    runAppleScript(`
      tell application "Calendar"
        tell calendar "${calendar}"
          ${events
            .map((event) => {
              const dateFormat = "EEEE, MMMM d, yyyy HH:mm";
              return `make new event with properties { summary: "${event.title}", start date:(date "${formatDate(event.startDate, dateFormat)}"), end date:(date "${formatDate(event.endDate, dateFormat)}") }`;
            })
            .join("\n")}
        end tell
      end tell
    `),
    500,
  );

  toast.title = `Event${events.length > 1 ? "s" : ""} added to ${calendar}`;
  toast.style = Toast.Style.Success;
}

export function AddToCalendar({ event }: { event: CalendarEvent }) {
  const [opened, setOpened] = useState(false);
  const [lastCalendar, setLastCalendar] = useCachedState<string>("latest-calendar");
  const { data: calendars, isLoading } = useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (key) => getCalendars(),
    ["calendars"],
    { execute: opened },
  );

  return (
    <ActionPanel.Submenu
      icon={Icon.Calendar}
      title="Add to Calendar"
      isLoading={isLoading}
      onOpen={() => setOpened(true)}
    >
      {calendars?.map((item, index) => (
        <Action
          key={index}
          autoFocus={lastCalendar === item.name}
          title={item.name}
          icon={Icon.Calendar}
          onAction={() => {
            setLastCalendar(item.name);
            addEventsToCalendar(item.name, [event]);
          }}
        />
      ))}
    </ActionPanel.Submenu>
  );
}
