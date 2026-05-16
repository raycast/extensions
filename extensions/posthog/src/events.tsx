import { Action, ActionPanel, LaunchProps, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useContext, useState } from "react";

import { ProjectSelector, ProjectsContext, WithProjects } from "../helpers/ProjectsContext";
import { useUrl } from "../helpers/useUrl";
import { EventDefinition, listEventDefinitions } from "./api/events";

export type EventsArguments = {
  query?: string;
};

function Events({ initial }: { initial: string }) {
  const { selectedId } = useContext(ProjectsContext);
  const [search, setSearch] = useState(initial);

  const { data, isLoading } = useCachedPromise(
    (id: string, term: string) =>
      listEventDefinitions(id, term ? { search: term, limit: 50 } : { limit: 50 }).then((r) => r.results),
    [selectedId ?? "", search],
    {
      execute: !!selectedId,
      keepPreviousData: true,
      onError: (e) => showFailureToast(e, { title: "Couldn't load events" }),
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search event definitions..."
      searchBarAccessory={<ProjectSelector />}
      onSearchTextChange={setSearch}
      searchText={search}
      throttle
    >
      {data && data.length > 0 ? (
        <List.Section title="Events">
          {data.map((event) => (
            <EventItem key={event.id} event={event} />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView title="No events" />
      )}
    </List>
  );
}

function EventItem({ event }: { event: EventDefinition }) {
  const appUrl = useUrl(`data-management/events/${event.id}`);
  const accessories: List.Item.Accessory[] = [];
  if (event.volume_30_day != null) accessories.push({ text: `${event.volume_30_day} (30d)`, tooltip: "30-day volume" });
  if (event.last_seen_at) accessories.push({ date: new Date(event.last_seen_at), tooltip: "Last seen" });
  return (
    <List.Item
      title={event.name}
      accessories={accessories}
      actions={
        <ActionPanel title={event.name}>
          <Action.OpenInBrowser url={appUrl} />
          <Action.CopyToClipboard
            title="Copy Event Name"
            content={event.name}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={appUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: EventsArguments }>) {
  return (
    <WithProjects>
      <Events initial={props.arguments.query ?? ""} />
    </WithProjects>
  );
}
