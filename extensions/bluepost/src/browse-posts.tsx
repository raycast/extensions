import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getMastodonAccounts, type MastodonAccount } from "./lib/accounts";
import { login, fetchRecentPosts, type BlueskyPost } from "./lib/bluesky";
import { repostToMastodon } from "./lib/posting";
import { getRepostHistoryMap } from "./lib/repost-history";

export default function BrowsePosts() {
  const { data: mastoAccounts } = usePromise(getMastodonAccounts);
  const {
    data: posts,
    isLoading,
    revalidate,
  } = usePromise(async () => {
    const agent = await login();
    return fetchRecentPosts(agent);
  }, []);
  const { data: historyMap, revalidate: revalidateHistory } =
    usePromise(getRepostHistoryMap);

  function getRepostTags(postUri: string) {
    const reposted = historyMap?.[postUri] ?? [];
    return (mastoAccounts ?? [])
      .filter((a) => reposted.includes(a.id))
      .map((a) => ({ text: a.instance, color: Color.Green }));
  }

  async function handleRepost(post: BlueskyPost, accounts: MastodonAccount[]) {
    if (post.autoPost) {
      const confirmed = await confirmAlert({
        title: "Repost Automated Post?",
        message:
          "This post was automatically generated. Are you sure you want to cross-post it?",
        primaryAction: { title: "Repost", style: Alert.ActionStyle.Default },
      });
      if (!confirmed) return;
    }
    await showToast({ style: Toast.Style.Animated, title: "Reposting..." });
    await repostToMastodon(post, accounts);
    revalidateHistory();
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {posts?.map((post) => {
        const tags = getRepostTags(post.uri);
        const accessories: List.Item.Accessory[] = [];
        if (post.autoPost) {
          accessories.push({ tag: { value: "auto", color: Color.Blue } });
        }
        if (post.hasMedia) {
          accessories.push({ icon: Icon.Image, tooltip: "Has media" });
        }
        for (const tag of tags) {
          accessories.push({ tag: { value: tag.text, color: tag.color } });
        }
        accessories.push({
          date: new Date(post.createdAt),
          tooltip: formatDate(post.createdAt),
        });

        return (
          <List.Item
            key={post.uri}
            title={post.text.slice(0, 80)}
            subtitle={post.text.length > 80 ? "..." : undefined}
            accessories={accessories}
            detail={
              <List.Item.Detail
                markdown={post.text}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Date"
                      text={formatDate(post.createdAt)}
                    />
                    {post.hasMedia && (
                      <List.Item.Detail.Metadata.Label
                        title="Media"
                        icon={Icon.Image}
                        text="Has media"
                      />
                    )}
                    {post.autoPost && (
                      <List.Item.Detail.Metadata.TagList title="Type">
                        <List.Item.Detail.Metadata.TagList.Item
                          text="auto"
                          color={Color.Blue}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {tags.length > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Reposted to">
                        {tags.map((tag) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={tag.text}
                            text={tag.text}
                            color={tag.color}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {mastoAccounts && mastoAccounts.length > 0 && (
                  <>
                    <Action
                      title="Repost to All Mastodon"
                      icon={Icon.ArrowRight}
                      onAction={() => handleRepost(post, mastoAccounts)}
                    />
                    {mastoAccounts.map((account) => (
                      <Action
                        key={account.id}
                        title={`Repost to ${account.instance}`}
                        icon={Icon.ArrowRight}
                        onAction={() => handleRepost(post, [account])}
                      />
                    ))}
                  </>
                )}
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={bskyPostUrl(post.uri)}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard
                  title="Copy Text"
                  content={post.text}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => {
                    revalidate();
                    revalidateHistory();
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function bskyPostUrl(uri: string): string {
  const match = uri.match(/^at:\/\/(did:[^/]+)\/app\.bsky\.feed\.post\/(.+)$/);
  if (!match) return "https://bsky.app";
  return `https://bsky.app/profile/${match[1]}/post/${match[2]}`;
}
