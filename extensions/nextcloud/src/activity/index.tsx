import { Action, ActionPanel, List } from "@raycast/api";
import { formatDistanceToNow, parseISO } from "date-fns";
import { capitalize } from "../utils";
import { type Activity, useActivity } from "./hooks";
import { getIcon } from "./utils";

export function Activity() {
  const { activity, isLoading, pagination } = useActivity();

  return (
    <List isLoading={isLoading} pagination={pagination}>
      <List.Section title="All activities" subtitle={String(activity.length)}>
        {activity.map((result) => (
          <Item key={result.activityId + result.datetime} item={result} />
        ))}
      </List.Section>
    </List>
  );
}

function Item({ item }: { item: Activity }) {
  const relativeDate = formatDistanceToNow(parseISO(item.datetime), { addSuffix: true });
  return (
    <List.Item
      title={item.subject}
      subtitle={capitalize(item.objectType)}
      accessories={[{ text: relativeDate }]}
      icon={getIcon(item.type)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={item.link} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
