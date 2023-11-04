import { ActionPanel, Detail, List, Action } from "@raycast/api";
import { useEvents } from "./hooks";

export default function Command() {
  const { events } = useEvents();

  return (
    <List>
      {events &&
        events
          .filter((event) => event.live)
          .map((event) => (
            <List.Item
              icon={"location.svg"}
              key={event.id}
              title={event.name}
              subtitle={event.total_attendees + " people"}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Event"
                    target={
                      <Detail
                        markdown={event.description}
                        actions={
                          <ActionPanel>
                            <Action.OpenInBrowser title="Open in Decentraland" url={event.url} />
                          </ActionPanel>
                        }
                      />
                    }
                  />
                  <Action.OpenInBrowser title="Open in Decentraland" url={event.url} />
                </ActionPanel>
              }
            />
          ))}
    </List>
  );
}
