import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  deletePost,
  getAccount,
  getChannels,
  getDraftPosts,
} from "./utils/buffer-api";
import { Channel, Post } from "./utils/types";
import {
  channelLabel,
  formatDate,
  postStatusLabel,
  serviceIcon,
  truncateText,
} from "./utils/helpers";

function DraftPostDetail({ post, channel }: { post: Post; channel?: Channel }) {
  const markdown = `
# Draft Post

**Channel:** ${channel ? channelLabel(channel) : post.channelId}

**Status:** ${postStatusLabel(post.status)}

${post.text}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Draft Post"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Status"
            text={postStatusLabel(post.status)}
            icon={{ source: Icon.Pencil, tintColor: Color.Orange }}
          />
          {channel && (
            <Detail.Metadata.Label
              title="Channel"
              text={channel.displayName || channel.name}
              icon={serviceIcon(channel.service)}
            />
          )}
          {post.createdAt && (
            <Detail.Metadata.Label
              title="Created"
              text={formatDate(post.createdAt)}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Post ID" text={post.id} />
        </Detail.Metadata>
      }
    />
  );
}

export default function DraftPosts() {
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
    async (id?: string) => (id ? getDraftPosts(id) : null),
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
    channels?.map((channel) => [channel.id, channel]) ?? [],
  );
  const posts = postsConnection?.edges.map((edge) => edge.node) ?? [];

  const grouped = posts.reduce<Record<string, Post[]>>((accumulator, post) => {
    const key = post.channelId;
    accumulator[key] = accumulator[key] ?? [];
    accumulator[key].push(post);
    return accumulator;
  }, {});

  async function handleDelete(post: Post) {
    const confirmed = await confirmAlert({
      title: "Delete draft post?",
      message: truncateText(post.text, 120),
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting draft…",
    });
    try {
      await mutate(deletePost(post.id), {
        optimisticUpdate(current) {
          if (!current) return null;
          return {
            ...current,
            edges: current.edges.filter((edge) => edge.node.id !== post.id),
          };
        },
      });
      toast.style = Toast.Style.Success;
      toast.title = "Draft deleted";
    } catch (deleteError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete draft";
      toast.message =
        deleteError instanceof Error
          ? deleteError.message
          : String(deleteError);
    }
  }

  const isLoading = loadingAccount || loadingChannels || loadingPosts;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Draft Posts (${posts.length})`}
    >
      {posts.length === 0 && !isLoading && (
        <List.EmptyView
          title="No draft posts"
          description="Drafts and posts pending approval will appear here."
          icon={Icon.Pencil}
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
                subtitle={postStatusLabel(post.status)}
                icon={{ source: Icon.Pencil, tintColor: Color.Orange }}
                accessories={
                  post.createdAt
                    ? [{ text: formatDate(post.createdAt) }]
                    : undefined
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="View Draft"
                      icon={Icon.Eye}
                      onAction={() =>
                        push(<DraftPostDetail post={post} channel={channel} />)
                      }
                    />
                    <Action.CopyToClipboard
                      title="Copy Draft Text"
                      content={post.text}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Delete Draft"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(post)}
                    />
                    <Action.OpenInBrowser
                      title="Open Buffer"
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
