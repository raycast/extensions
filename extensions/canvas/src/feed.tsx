import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useFeed } from "./hooks/useFeed";

export default function FeedCommand() {
  const { activities, isLoading, error } = useFeed();

  function getIcon(activity: { type: string }) {
    if (activity.type === "Announcement") {
      return { source: Icon.Megaphone };
    }
    return { source: Icon.Bell };
  }

  if (error) {
    showToast(Toast.Style.Failure, "Failed to fetch feed", error.message);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search activities...">
      {activities.map((activity) => (
        <List.Item
          key={activity.id}
          title={activity.title}
          icon={getIcon(activity)}
          accessories={[{ tag: new Date(activity.createdAt) }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={activity.htmlUrl} />
              <Action.CopyToClipboard title="Copy Activity Link" content="#1" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
