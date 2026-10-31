import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { APP_URL, deletePost, htmlToText, listPosts, Post } from "./api";

const DAYS_AHEAD = 30;

async function loadScheduledPosts(): Promise<Post[]> {
  const now = new Date();
  const end = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const posts = await listPosts(now, end);
  return posts
    .filter((post) => post.state === "QUEUE" && new Date(post.publishDate) >= now)
    .sort((a, b) => new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime());
}

const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export default function Command() {
  const [channelId, setChannelId] = useState("all");
  const { data, error, isLoading, revalidate } = usePromise(loadScheduledPosts, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Could not load your posts" });
    },
  });
  const posts = data ?? [];

  const channels = new Map(posts.map((post) => [post.integration.id, post.integration]));
  const visible = channelId === "all" ? posts : posts.filter((post) => post.integration.id === channelId);

  const sections = new Map<string, Post[]>();
  for (const post of visible) {
    const day = dayFormat.format(new Date(post.publishDate));
    sections.set(day, [...(sections.get(day) ?? []), post]);
  }

  async function remove(post: Post) {
    const confirmed = await confirmAlert({
      title: "Delete this post?",
      message: "It is removed from Hookpost and will not be published.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting post" });
    try {
      await deletePost(post.id);
      toast.style = Toast.Style.Success;
      toast.title = "Post deleted";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete the post";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={visible.length > 0}
      searchBarPlaceholder="Search scheduled posts"
      searchBarAccessory={
        <List.Dropdown tooltip="Channel" value={channelId} onChange={setChannelId}>
          <List.Dropdown.Item title="All Channels" value="all" />
          {[...channels.values()].map((channel) => (
            <List.Dropdown.Item key={channel.id} title={channel.name} value={channel.id} />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.Calendar}
          title={error ? "Could not load your posts" : "Nothing scheduled"}
          description={
            error
              ? "Check your API key and connection, then refresh."
              : `No posts are scheduled in the next ${DAYS_AHEAD} days.`
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
              <Action.OpenInBrowser title="Open Hookpost" url={`${APP_URL}/launches`} />
            </ActionPanel>
          }
        />
      )}
      {[...sections.entries()].map(([day, dayPosts]) => (
        <List.Section key={day} title={day}>
          {dayPosts.map((post) => {
            const text = htmlToText(post.content);
            const time = timeFormat.format(new Date(post.publishDate));
            return (
              <List.Item
                key={post.id}
                title={text.split("\n")[0] || "(no text)"}
                keywords={[post.integration.name, post.integration.providerIdentifier]}
                icon={
                  post.integration.picture ? { source: post.integration.picture, mask: Image.Mask.Circle } : Icon.Person
                }
                accessories={[{ tag: { value: time, color: Color.Blue } }]}
                detail={
                  <List.Item.Detail
                    markdown={text}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Channel" text={post.integration.name} />
                        <List.Item.Detail.Metadata.Label title="Network" text={post.integration.providerIdentifier} />
                        <List.Item.Detail.Metadata.Label
                          title="Publishes"
                          text={`${dayFormat.format(new Date(post.publishDate))}, ${time}`}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open Hookpost" url={`${APP_URL}/launches`} />
                    <Action.CopyToClipboard title="Copy Post Text" content={text} />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                    <Action
                      title="Delete Post"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => remove(post)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
