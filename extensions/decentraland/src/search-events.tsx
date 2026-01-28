import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { useEvents } from "./hooks";
import { Event } from "./types";

export default function Command() {
  const { isLoading, events } = useEvents();
  const liveEvents = events.filter((event) => event.live);
  const upcomingEvents = events.filter((event) => !event.live);

  function EventItem({ event }: { event: Event }) {
    return (
      <List.Item
        icon={event.live ? Icon.Pin : Icon.PinDisabled}
        title={event.name}
        subtitle={event.total_attendees + " people"}
        accessories={[{ date: new Date(event.next_start_at), tooltip: `Next Start At: ${event.next_start_at}` }]}
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Eye}
              title="Show Event"
              target={
                <Detail
                  markdown={event.description}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser icon="command-icon.png" title="Open in Decentraland" url={event.url} />
                    </ActionPanel>
                  }
                />
              }
            />
            <Action.OpenInBrowser icon="command-icon.png" title="Open in Decentraland" url={event.url} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search events">
      <List.Section title="Live" subtitle={`${liveEvents.length} events`}>
        {liveEvents.map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </List.Section>
      <List.Section title="Upcoming" subtitle={`${upcomingEvents.length} events`}>
        {upcomingEvents.map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </List.Section>
    </List>
  );
}
