import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { formatDistance } from "date-fns";
import { EmptyView } from "../EmptyView";
import { IEvent, IServer } from "../../types";
import { useServerEvents } from "../../hooks/useServerEvents";
import { useEventOutput } from "../../hooks/useEventOutput";

export const ServerEvents = ({ server }: { server: IServer }) => {
  const { events, loading } = useServerEvents(server);
  if (!events?.length && !loading) {
    return <EmptyView title="No events found" />;
  }
  return (
    <List isLoading={loading} navigationTitle={`${server.name} -> Events`}>
      {events?.map((event: IEvent) => (
        <List.Item
          key={event.id}
          id={event.id.toString()}
          title={event.description ?? "No description"}
          subtitle={event.created_at ? formatDistance(new Date(event.created_at), new Date(), { addSuffix: true }) : ""}
          icon={Icon.Clock}
          accessories={[{ text: event.ran_as }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Output"
                icon={Icon.Binoculars}
                target={<EventOutput server={server} event={event} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

const EventOutput = ({ server, event }: { server: IServer; event: IEvent }) => {
  const { output, loading } = useEventOutput({ server, event });
  return (
    <Detail
      isLoading={loading}
      navigationTitle={event.description ?? "Event output"}
      markdown={output ? "```sh\n" + output + "\n```" : loading ? "" : "This event recorded no output."}
    />
  );
};
