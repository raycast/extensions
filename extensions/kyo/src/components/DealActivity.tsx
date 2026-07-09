import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ActivityFeed } from "../api/resources";
import { formatDate } from "../lib/helpers";

/** Read-only activity (audit) timeline for a deal. Requires activity:read. */
export function DealActivityList({
  dealId,
  title,
}: {
  dealId: string;
  title: string;
}) {
  const { data, isLoading } = useCachedPromise(
    (id: string) => ActivityFeed.forEntity("deal", id),
    [dealId],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Activity · ${title}`}>
      <List.EmptyView title="No activity yet" icon={Icon.Clock} />
      {data.map((event) => (
        <List.Item
          key={event.id}
          icon={Icon.Clock}
          title={event.action || "Activity"}
          accessories={[{ text: formatDate(event.created_at) }]}
        />
      ))}
    </List>
  );
}
