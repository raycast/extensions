import {
  List,
  Icon,
  Color,
  Detail,
  Action,
  ActionPanel,
  Alert,
  useNavigation,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getAccount,
  getChannels,
  getScheduledPosts,
  deletePost,
} from "./utils/buffer-api";
import { Channel, Post } from "./utils/types";
import {
  channelLabel,
  formatDate,
  serviceIcon,
  truncateText,
} from "./utils/helpers";

function PostDetail({ post, channel }: { post: Post; channel?: Channel }) {
  const markdown = `
# Scheduled Post

**Channel:** ${channel ? channelLabel(channel) : post.channelId}

**Scheduled for:** ${formatDate(post.dueAt)}

---

${post.text}
${post.assets?.length ? `\n\n**Media assets:** ${post.assets.length}` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Post Detail"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text="Scheduled"
            icon={{ source: Icon.Clock, tintColor: Color.Blue }}
          />
          <Detail.Metadata.Label
            title="Scheduled for"
            text={formatDate(post.dueAt)}
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
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Post ID" text={post.id} />
        </Detail.Metadata>
      }
    />
  );
}

export default function ScheduledPosts() {
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
    mutate,
  } = usePromise(
    async (id?: string) => (id ? getScheduledPosts(id) : null),
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

  async function handleDelete(post: Post) {
    const confirmed = await confirmAlert({
      title: "Delete scheduled post?",
      message: truncateText(post.text, 120),
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting post…",
    });
    try {
      await mutate(deletePost(post.id), {
        optimisticUpdate(current) {
          if (!current) return null;
          return {
            ...current,
            edges: current.edges.filter((e) => e.node.id !== post.id),
          };
        },
      });
      toast.style = Toast.Style.Success;
      toast.title = "Post deleted";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete";
      toast.message = String(e);
    }
  }

  const isLoading = loadingAccount || loadingChannels || loadingPosts;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Scheduled Posts (${posts.length})`}
    >
      {posts.length === 0 && !isLoading && (
        <List.EmptyView
          title="No scheduled posts"
          description="Your Buffer queue is empty."
          icon={Icon.Calendar}
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
                subtitle={formatDate(post.dueAt)}
                icon={{ source: Icon.Clock, tintColor: Color.Blue }}
                keywords={[post.text]}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Post"
                      icon={Icon.Eye}
                      onAction={() =>
                        push(<PostDetail post={post} channel={channel} />)
                      }
                    />
                    <Action.CopyToClipboard
                      title="Copy Post Text"
                      content={post.text}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    {post.assets?.[0]?.source && (
                      <Action.OpenInBrowser
                        title="Open First Asset"
                        url={post.assets[0].source}
                        icon={Icon.Image}
                      />
                    )}
                    <Action.OpenInBrowser
                      title="Open in Buffer"
                      url="https://publish.buffer.com"
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    <Action
                      title="Delete Post"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(post)}
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
