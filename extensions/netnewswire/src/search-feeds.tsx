import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { getFavicon, runAppleScript, showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getArticles, getFeeds } from "./utils";
import { Feed } from "./types";

export default function SearchFeeds() {
  const { isLoading, data: feeds, mutate } = useCachedPromise(getFeeds, [], { initialData: [] });
  return (
    <List isLoading={isLoading}>
      {feeds.map((feed) => (
        <List.Item
          key={feed.name}
          icon={feed.icon || getFavicon(feed.url)}
          title={feed.name}
          subtitle={feed.account}
          accessories={[{ icon: Icon.EyeDisabled, text: `${feed.totalArticles - feed.readArticles}` }]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Text} title="Articles" target={<Articles feed={feed} />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Articles({ feed }: { feed: Feed }) {
  const {
    isLoading,
    data: articles,
    mutate,
  } = useCachedPromise(
    async (feedName) => {
      const articles = await getArticles(feedName);
      return articles;
    },
    [feed.name],
    { initialData: [] },
  );

  const [isToggling, setIsToggling] = useState(false);
  async function toggle(articleId: string, field: "read" | "starred", newStatus: boolean) {
    setIsToggling(true);
    try {
      await mutate(
        runAppleScript(`
          tell application "NetNewsWire"
            set allAccounts to every account
            repeat with nthAccount in allAccounts
              set userFeeds to allFeeds of nthAccount
              repeat with nthFeed in userFeeds
                set allArticles to every article of nthFeed
                repeat with nthArticle in allArticles
                  if id of nthArticle is "${articleId}" then
                    set ${field} of nthArticle to ${newStatus}
                    return "success"
                  end if
                end repeat
              end repeat
            end repeat
          end tell
        `),
        {
          optimisticUpdate(data) {
            return data.map((a) =>
              a.id === articleId
                ? { ...a, ...(field === "read" ? { isRead: newStatus } : { isStarred: newStatus }) }
                : a,
            );
          },
          shouldRevalidateAfter: false,
        },
      );
    } catch (error) {
      await showFailureToast(error);
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <List isLoading={isLoading || isToggling} isShowingDetail>
      {articles.map((article) => (
        <List.Item
          key={article.id}
          icon={
            article.isStarred
              ? { source: Icon.Star, tintColor: Color.Yellow }
              : !article.isRead
                ? { source: Icon.Dot, tintColor: Color.Blue }
                : undefined
          }
          title={article.title}
          subtitle={!article.title ? article.content : ""}
          detail={<List.Item.Detail markdown={article.content} />}
          actions={
            <ActionPanel>
              <Action
                icon={article.isRead ? Icon.Circle : Icon.CircleProgress100}
                title={`Mark as ${article.isRead ? "Unread" : "Read"}`}
                onAction={() => toggle(article.id, "read", !article.isRead)}
              />
              <Action
                icon={article.isStarred ? Icon.StarDisabled : Icon.Star}
                title={`Mark as ${article.isStarred ? "Unstarred" : "Starred"}`}
                onAction={() => toggle(article.id, "starred", !article.isStarred)}
              />
              <Action.OpenInBrowser url={article.url} shortcut={Keyboard.Shortcut.Common.Open} />
              <Action.CopyToClipboard
                title="Copy Article URL"
                content={article.url}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
