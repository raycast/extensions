import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import moment from "moment-timezone";
import { useState } from "react";

import { schedule } from "./data";
import { ScheduleEvent } from "./types";

const userTimezone = moment.tz.guess();

export default function Command() {
  const [showAllEvents, setShowAllEvents] = useState(false);

  const filteredSchedule = showAllEvents ? schedule : schedule.filter((event) => moment(event.to).isAfter(moment()));

  const eventsByStage = filteredSchedule.reduce(
    (acc, event) => {
      if (!acc[event.location]) {
        acc[event.location] = [];
      }
      acc[event.location].push(event);
      return acc;
    },
    {} as Record<string, ScheduleEvent[]>,
  );

  return (
    <List
      navigationTitle="Make with Notion Schedule"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter events"
          storeValue={true}
          onChange={(newValue) => setShowAllEvents(newValue === "all")}
        >
          <List.Dropdown.Item title="Current & Upcoming Events" value="upcoming" />
          <List.Dropdown.Item title="All Events" value="all" />
        </List.Dropdown>
      }
    >
      {Object.entries(eventsByStage).map(([stage, events]) => (
        <List.Section key={stage} title={stage}>
          {events.map((event, index) => (
            <List.Item
              key={`${stage}-${index}`}
              icon={getEventIcon(event)}
              title={event.name}
              subtitle={`${formatTime(event.from)} - ${formatTime(event.to)}`}
              accessories={[{ text: capitalizeFirstLetter(moment(event.from).fromNow()) }]}
              actions={
                <ActionPanel>
                  <Action.Push title="Show Details" icon={Icon.Text} target={<EventDetail event={event} />} />
                  <Action.OpenInBrowser title="Make with Notion Website" url="https://makewithnotion.com" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function EventDetail({ event }: { event: ScheduleEvent }) {
  const speakersInfo =
    event.speakers.length > 0
      ? event.speakers
          .map((speaker) => `- ${speaker.name}, ${speaker.title}${speaker.company ? ` at ${speaker.company}` : ""}`)
          .join("\n")
      : "";

  const markdown = `
# ${event.name}

**Time:** ${formatTime(event.from)} - ${formatTime(event.to)}
**Original Time:** ${formatTime(event.from, "America/Los_Angeles")} - ${formatTime(event.to, "America/Los_Angeles")} (PDT)
**Location:** ${event.location}

## Description
${event.description || "No description available."}

${speakersInfo ? `## Speakers\n${speakersInfo}` : ""}
  `;

  return <Detail markdown={markdown} />;
}

function formatTime(dateString: string, timezone: string = userTimezone): string {
  return moment.tz(dateString, timezone).format("h:mm A");
}

function getEventIcon(event: ScheduleEvent): Icon | { source: string } {
  if (event.speakers.length > 0 && event.speakers[0].image) {
    return { source: event.speakers[0].image };
  }
  return Icon.Calendar;
}

function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
