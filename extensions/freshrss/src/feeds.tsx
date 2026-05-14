import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { api, type Subscription, type UnreadCount } from "./api";
import ArticleList from "./article-list";

function safeHostname(url: string | undefined): string {
  if (!url) return "—";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

interface FeedGroup {
  id: string;
  label: string;
  unreadCount: number;
  feedCount: number;
}

function buildGroups(subscriptions: Subscription[], unreadCounts: UnreadCount[]): FeedGroup[] {
  const unreadMap = new Map(unreadCounts.map((entry) => [entry.id, entry.count]));
  const groups = new Map<string, FeedGroup>();

  for (const subscription of subscriptions) {
    for (const category of subscription.categories ?? []) {
      const existing = groups.get(category.id);
      if (existing) {
        existing.feedCount += 1;
        continue;
      }

      groups.set(category.id, {
        id: category.id,
        label: category.label,
        unreadCount: unreadMap.get(category.id) ?? 0,
        feedCount: 1,
      });
    }
  }

  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export default function Command() {
  const [feeds, setFeeds] = useState<Subscription[]>([]);
  const [groups, setGroups] = useState<FeedGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const prefs = getPreferenceValues<Preferences>();

  useEffect(() => {
    (async () => {
      try {
        const [subs, unreadCounts] = await Promise.all([api.getSubscriptions(), api.getUnreadCounts()]);
        const sortedSubs = subs.sort((a, b) => a.title.localeCompare(b.title));
        setFeeds(sortedSubs);
        setGroups(buildGroups(sortedSubs, unreadCounts));
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error loading feeds",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="FreshRSS Feeds" searchBarPlaceholder="Search feeds...">
      {!isLoading && feeds.length === 0 ? (
        <List.EmptyView
          icon={Icon.Rss}
          title="No Feeds Found"
          description="Make sure your FreshRSS instance has subscriptions"
        />
      ) : null}
      {groups.length > 0 ? (
        <List.Section title="Groups">
          {groups.map((group) => (
            <List.Item
              key={group.id}
              id={group.id}
              icon={Icon.Folder}
              title={group.label}
              accessories={[
                { text: `${group.feedCount} feeds`, tooltip: `${group.feedCount} feeds in this group` },
                { text: String(group.unreadCount), tooltip: `${group.unreadCount} unread articles` },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Browse Group"
                    icon={Icon.Folder}
                    target={<ArticleList streamId={group.id} streamTitle={group.label} />}
                  />
                  <Action.OpenInBrowser
                    url={prefs.baseUrl}
                    title="Open Freshrss"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
      <List.Section title="Feeds">
        {feeds.map((feed) => (
          <List.Item
            key={feed.id}
            id={feed.id}
            icon={Icon.Rss}
            title={feed.title}
            subtitle={feed.categories?.[0]?.label || "—"}
            accessories={[{ text: safeHostname(feed.htmlUrl), tooltip: feed.htmlUrl ?? "" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Browse Articles"
                  icon={Icon.Document}
                  target={<ArticleList streamId={feed.id} streamTitle={feed.title} />}
                />
                {feed.categories?.map((category) => (
                  <Action.Push
                    key={`${feed.id}-${category.id}`}
                    title={`Open Group: ${category.label}`}
                    icon={Icon.Folder}
                    target={<ArticleList streamId={category.id} streamTitle={category.label} />}
                  />
                ))}
                {feed.htmlUrl ? (
                  <Action.OpenInBrowser url={feed.htmlUrl} shortcut={{ modifiers: ["cmd", "shift"], key: "o" }} />
                ) : null}
                <Action.OpenInBrowser
                  url={prefs.baseUrl}
                  title="Open Freshrss"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
