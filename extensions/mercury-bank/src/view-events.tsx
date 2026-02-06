import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { FeatureGuard } from "./components/FeatureGuard";
import { EmptyView } from "./components/EmptyView";
import { AccountSwitcherActions } from "./components/AccountSwitcher";
import { useEvents } from "./lib/hooks/useEvents";
import { formatDateTime, getRelativeDate } from "./lib/utils";

export default function ViewEvents() {
  return (
    <FeatureGuard feature="events">
      {(apiKey, accountName) => (
        <EventsList apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function EventsList({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { data: events, isLoading } = useEvents(apiKey);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Mercury - ${accountName}`}
      searchBarPlaceholder="Search events..."
    >
      {!isLoading && events && events.length === 0 && (
        <EmptyView
          title="No Events"
          description="No events found"
          icon={Icon.Clock}
        />
      )}
      <List.Section title="Events" subtitle={`${(events ?? []).length} events`}>
        {(events ?? []).map((event) => (
          <List.Item
            key={event.id}
            title={`${event.operationType} ${event.resourceType}`}
            subtitle={getRelativeDate(event.occurredAt)}
            icon={{ source: Icon.Clock, tintColor: Color.Blue }}
            accessories={[
              { tag: event.resourceType },
              { text: formatDateTime(event.occurredAt) },
            ]}
            keywords={[event.resourceType, event.operationType]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Changes"
                  content={JSON.stringify(event.mergePatch, null, 2)}
                />
                <Action.CopyToClipboard
                  title="Copy Event Id"
                  content={event.id}
                />
                <Action.CopyToClipboard
                  title="Copy Resource Id"
                  content={event.resourceId}
                />
                <AccountSwitcherActions />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}