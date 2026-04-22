import {
  List,
  Icon,
  Color,
  Detail,
  Action,
  ActionPanel,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getAccount, getChannels, getSentPosts } from "./utils/buffer-api";
import { Channel, Post } from "./utils/types";
import {
  channelLabel,
  formatDate,
  serviceIcon,
  truncateText,
} from "./utils/helpers";

function PostDetail({ post, channel }: { post: Post; channel?: Channel }) {
  const mediaCount = post.assets?.length ?? 0;
  const mediaSummary =
    mediaCount > 0 ? `\n\n**Media assets:** ${mediaCount}` : "";
  const externalLink = post.externalLink
    ? `\n\n**Live link:** ${post.externalLink}`
    : "";

  const markdown = `
# Sent Post

**Channel:** ${channel ? channelLabel(channel) : post.channelId}

**Sent:** ${formatDate(post.sentAt || post.dueAt)}

---

${post.text}
${mediaSummary}
${externalLink}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Sent Post"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text="Sent"
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          />
          <Detail.Metadata.Label
            title="Sent"
            text={formatDate(post.sentAt || post.dueAt)}
          />
          {channel && (
            <Detail.Metadata.Label
              title="Channel"
              text={channel.displayName || channel.name}
              icon={serviceIcon(channel.service)}
            />
          )}
          {(post.assets?.length ?? 0) > 0 && (
            <Detail.Metadata.Label
              title="Assets"
              text={String(post.assets?.length ?? 0)}
            />
          )}
          {post.externalLink && (
            <Detail.Metadata.Link
              title="Live Link"
              target={post.externalLink}
              text="Open Published Post"
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Post ID" text={post.id} />
        </Detail.Metadata>
      }
    />
  );
}

function statsBadge(stats?: Post["statistics"]): string {
  if (!stats) return "";
  const parts: string[] = [];
  if (stats.likes != null) parts.push(`♥ ${stats.likes}`);
  if (stats.clicks != null) parts.push(`🔗 ${stats.clicks}`);
  if (stats.reach != null) parts.push(`👁 ${stats.reach}`);
  return parts.slice(0, 2).join("  ");
}

export default function SentPosts() {
  const { push } = useNavigation();

  const {
    data: account,
    isLoading: loadingAccount,
    error: accountError,
  } = usePromise(getAccount);
  const orgId = account?.organizations?.[0]?.id;

  const { data: channels, isLoading: loadingChannels } = usePromise(
    async (id?: string) => (id ? getChannels(id) : []),
    [orgId],
  );

  const {
    data: postsConnection,
    isLoading: loadingPosts,
    error: postsError,
  } = usePromise(
    async (id?: string) => (id ? getSentPosts(id) : null),
    [orgId],
  );

  const error = accountError ?? postsError;

  if (error) {
    return (
      <Detail
        markdown={`## ❌ Error\n\n${error.message}\n\nCheck your **Buffer Access Token** in Raycast preferences.`}
      />
    );
  }

  const channelMap = new Map<string, Channel>(
    channels?.map((c) => [c.id, c]) ?? [],
  );
  const posts = postsConnection?.edges.map((e) => e.node) ?? [];

  const grouped = posts.reduce<Record<string, Post[]>>((acc, post) => {
    const key = post.channelId;
    acc[key] = acc[key] ?? [];
    acc[key].push(post);
    return acc;
  }, {});

  const isLoading = loadingAccount || loadingChannels || loadingPosts;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Sent Posts (${posts.length})`}
    >
      {posts.length === 0 && !isLoading && (
        <List.EmptyView
          title="No sent posts"
          description="Posts you've sent will appear here."
          icon={Icon.CheckCircle}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Buffer"
                url="https://publish.buffer.com"
              />
            </ActionPanel>
          }
        />
      )}
      {Object.entries(grouped).map(([channelId, channelPosts]) => {
        const channel = channelMap.get(channelId);
        const sectionTitle = channel
          ? `${serviceIcon(channel.service)} ${channel.displayName || channel.name}`
          : channelId;

        return (
          <List.Section
            key={channelId}
            title={sectionTitle}
            subtitle={`${channelPosts.length} posts`}
          >
            {channelPosts.map((post) => (
              <List.Item
                key={post.id}
                title={truncateText(post.text, 70)}
                subtitle={
                  statsBadge(post.statistics) ||
                  formatDate(post.sentAt || post.dueAt)
                }
                icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                keywords={[post.text]}
                accessories={[{ text: formatDate(post.sentAt || post.dueAt) }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Post"
                      icon={Icon.BarChart}
                      onAction={() =>
                        push(<PostDetail post={post} channel={channel} />)
                      }
                    />
                    {post.externalLink && (
                      <Action.OpenInBrowser
                        title="Open Published Post"
                        url={post.externalLink}
                        icon={Icon.Link}
                      />
                    )}
                    <Action.CopyToClipboard
                      title="Copy Post Text"
                      content={post.text}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.OpenInBrowser
                      title="Open in Buffer"
                      url="https://publish.buffer.com"
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
