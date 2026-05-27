import { List, Action, ActionPanel, Icon } from "@raycast/api";
import type { Feed } from "../api/types";
import { FeedArticlesView } from "./FeedArticlesView";
import { EditFeedForm } from "./EditFeedForm";

type FeedListProps = {
  feeds: Feed[];
  isLoading: boolean;
  actions?: (feed: Feed) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  onRefresh?: () => void;
  unreadCounts?: Map<string, number>;
};

export function FeedList({ feeds, isLoading, actions, emptyTitle, emptyDescription, onRefresh, unreadCounts }: FeedListProps) {
  return (
    <List isLoading={isLoading} navigationTitle="Feeds" searchBarPlaceholder="Search feeds...">
      {feeds.length === 0 && !isLoading ? (
        <List.EmptyView
          title={emptyTitle || "No feeds found"}
          description={emptyDescription || "No feeds are subscribed on your FreshRSS instance"}
          actions={
            onRefresh ? (
              <ActionPanel>
                <Action title="Refresh" onAction={onRefresh} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : (
        feeds.map((feed) => {
          const unread = unreadCounts?.get(feed.id);
          const accessories: List.Item.Accessory[] = [];
          if (unread !== undefined && unread > 0) {
            accessories.push({ text: `${unread}`, tooltip: `${unread} unread` });
          }

          return (
            <List.Item
              key={feed.id}
              id={feed.id}
              title={feed.title}
              subtitle={feed.url || feed.htmlUrl || ""}
              icon={feed.iconUrl ? { source: feed.iconUrl } : Icon.Rss}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Articles"
                    icon={Icon.Document}
                    shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    target={<FeedArticlesView feedId={feed.id} feedTitle={feed.title} />}
                  />
                  <Action.Push
                    title="Edit Feed"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={<EditFeedForm feedId={feed.id} currentTitle={feed.title} onRefresh={onRefresh} />}
                  />
                  {feed.htmlUrl ? <Action.OpenInBrowser url={feed.htmlUrl} title="Open Site in Browser" /> : null}
                  {feed.url ? <Action.OpenInBrowser url={feed.url} title="Open Feed URL in Browser" /> : null}
                  {feed.url ? <Action.CopyToClipboard content={feed.url} title="Copy Feed URL" /> : null}
                  {feed.htmlUrl ? <Action.CopyToClipboard content={feed.htmlUrl} title="Copy Site URL" /> : null}
                  <Action.CopyToClipboard content={feed.id} title="Copy Feed ID" />
                  {actions ? actions(feed) : null}
                  {onRefresh ? (
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} shortcut={{ modifiers: ["cmd", "shift"], key: "r" }} />
                  ) : null}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}