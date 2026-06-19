/**
 * Events command for viewing bunq activity feed.
 */

import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { useBunqSession, withSessionRefresh } from "./hooks/useBunqSession";
import { getEvents, type Event } from "./api/endpoints";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { ErrorView } from "./components";
import { getErrorMessage } from "./lib/errors";
import { getEventIcon } from "./lib/icon-mapping";
import { type EventFilter, getEventDisplayInfo, getEventObjectType, filterMatchesEvent } from "./lib/event-helpers";
import { requireUserId } from "./lib/session-guard";

// ============== Main Component ==============

export default function EventsCommand() {
  const session = useBunqSession();
  const [filter, setFilter] = useState<EventFilter>("all");

  const {
    data: events,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (): Promise<Event[]> => {
      if (!session.userId || !session.sessionToken) {
        return [];
      }
      const userId = requireUserId(session);
      return withSessionRefresh(session, () => getEvents(userId, session.getRequestOptions(), { count: 100 }));
    },
    [],
    { execute: session.isConfigured && !session.isLoading },
  );

  if (session.isLoading) {
    return <List isLoading />;
  }

  if (session.error || error) {
    return (
      <ErrorView
        title="Error Loading Events"
        message={getErrorMessage(session.error || error)}
        onRetry={revalidate}
        onRefreshSession={session.refresh}
      />
    );
  }

  const filteredEvents = (events ?? []).filter((event) => filterMatchesEvent(filter, event));

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Events"
      searchBarPlaceholder="Search events..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by event type" value={filter} onChange={(v) => setFilter(v as EventFilter)}>
          <List.Dropdown.Item title="All Events" value="all" icon={Icon.List} />
          <List.Dropdown.Section title="Filter by Type">
            <List.Dropdown.Item title="Payments" value="Payment" icon={Icon.BankNote} />
            <List.Dropdown.Item title="Requests Sent" value="RequestInquiry" icon={Icon.ArrowRight} />
            <List.Dropdown.Item title="Requests Received" value="RequestResponse" icon={Icon.ArrowLeft} />
            <List.Dropdown.Item title="bunq.me" value="BunqMeTab" icon={Icon.Link} />
            <List.Dropdown.Item title="Scheduled Payments" value="ScheduledPayment" icon={Icon.Calendar} />
            <List.Dropdown.Item title="Cards" value="Card" icon={Icon.CreditCard} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredEvents.length === 0 && (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Events"
          description={filter === "all" ? "No activity yet" : `No ${filter} events`}
        />
      )}
      {filteredEvents.map((event) => {
        const icon = getEventIcon(event.action);
        const displayInfo = getEventDisplayInfo(event);
        const objectType = getEventObjectType(event);

        return (
          <List.Item
            key={event.id}
            title={displayInfo.title}
            subtitle={displayInfo.subtitle}
            icon={icon}
            accessories={[
              ...(objectType ? [{ tag: { value: objectType, color: Color.SecondaryText } }] : []),
              ...(event.created ? [{ date: new Date(event.created), tooltip: "Event date" }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
