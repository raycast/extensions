import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { showErrorToast } from "../lib/error-toast";
import { EventFilter, eventFields, eventLabel, eventPost, eventProfile, fetchEventPage } from "../lib/events";
import { formatDate, profileMarkdown } from "../lib/format";
import { MonitorEvent } from "../lib/schemas";
import { ErrorView } from "./error-view";
import { PostListItem } from "./post-list-item";

type EventListProps = {
  filter?: EventFilter;
  navigationTitle?: string;
};

const loadEventPage =
  (filter: EventFilter) =>
  async ({ cursor }: { cursor?: string }) => {
    const { events, nextCursor } = await fetchEventPage(filter, cursor);
    return { data: events, hasMore: nextCursor !== undefined, cursor: nextCursor };
  };

function eventSource({ username, query }: MonitorEvent): string | undefined {
  return username ? `@${username}` : (query ?? undefined);
}

function EventRow({ event }: { event: MonitorEvent }) {
  const label = eventLabel(event.type);
  const post = eventPost(event);
  if (post) return <PostListItem post={post} event={label} />;
  const source = eventSource(event);
  const profile = eventProfile(event);
  const Metadata = List.Item.Detail.Metadata;
  return (
    <List.Item
      title={label}
      subtitle={source}
      icon={Icon.Bell}
      accessories={[{ date: new Date(event.occurredAt) }]}
      detail={
        <List.Item.Detail
          markdown={profile ? profileMarkdown(profile) : undefined}
          metadata={
            <Metadata>
              <Metadata.Label title="Event" text={label} />
              {source && <Metadata.Label title="Monitor" text={source} />}
              <Metadata.Label title="Date" text={formatDate(event.occurredAt)} />
              {!profile &&
                eventFields(event).map(({ title, value }) => <Metadata.Label key={title} title={title} text={value} />)}
            </Metadata>
          }
        />
      }
    />
  );
}

export function EventList({ filter = {}, navigationTitle }: EventListProps) {
  const { data, error, isLoading, pagination, revalidate } = useCachedPromise(loadEventPage, [filter], {
    onError: (failure) => {
      showErrorToast(failure, revalidate);
    },
  });
  const isWaiting = isLoading || (!data && !error);
  const events = data ?? [];

  function emptyView() {
    if (isWaiting) return null;
    if (error) return <ErrorView error={error} onRetry={revalidate} />;
    return (
      <List.EmptyView icon={Icon.Bell} title="No Events Yet" description="Events from your monitors show up here." />
    );
  }

  return (
    <List
      isLoading={isWaiting}
      isShowingDetail={events.length > 0}
      navigationTitle={navigationTitle}
      pagination={pagination}
      searchBarPlaceholder="Filter Events"
    >
      {emptyView()}
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </List>
  );
}
