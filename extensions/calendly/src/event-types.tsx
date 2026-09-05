import { Icon, List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";

import { listEventTypes } from "./api/event-types";
import { EventTypeActions } from "./components/event-type-actions";
import { calendlyOAuth } from "./oauth/calendly";

function EventTypes() {
  const { data = [], isLoading } = useCachedPromise(listEventTypes, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search event types…">
      {!isLoading && data.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Active Event Types"
          description="Create or enable an event type in Calendly, then refresh this command."
        />
      ) : null}
      {data.map((eventType) => (
        <List.Item
          key={eventType.uri}
          icon={Icon.Calendar}
          title={eventType.name}
          subtitle={eventType.scheduling_url.replace(/^https?:\/\//, "")}
          keywords={[eventType.slug, eventType.description_plain ?? ""]}
          accessories={[{ text: `${eventType.duration} min` }, { tag: eventType.kind.replaceAll("_", " ") }]}
          actions={<EventTypeActions eventType={eventType} />}
        />
      ))}
    </List>
  );
}

export default withAccessToken(calendlyOAuth)(EventTypes);
