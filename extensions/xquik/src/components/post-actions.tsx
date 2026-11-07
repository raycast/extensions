import { Action, ActionPanel, Icon, Keyboard, showInFinder, showToast, Toast } from "@raycast/api";
import { ReactNode } from "react";
import { showErrorToast } from "../lib/error-toast";
import { postLink } from "../lib/format";
import { saveMedia } from "../lib/media";
import { Post } from "../lib/schemas";
import { PostFeedList } from "./post-feed-list";
import { ProfileScreen } from "./profile-screen";
import { SHORTCUTS } from "../lib/shortcuts";

type PostActionsProps = {
  post: Post;
  firstAction?: ReactNode;
  lastAction?: ReactNode;
};

async function downloadMedia(post: Post) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading Media" });
  try {
    const paths = await saveMedia(post.id);
    toast.style = Toast.Style.Success;
    toast.title = "Media Saved";
    toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(paths[0]) };
  } catch (error) {
    await toast.hide();
    await showErrorToast(error as Error, () => downloadMedia(post));
  }
}

export function PostActions({ post, firstAction, lastAction }: PostActionsProps) {
  const link = postLink(post);
  const { author } = post;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {firstAction}
        <Action.OpenInBrowser url={link} shortcut={Keyboard.Shortcut.Common.Open} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="View Replies"
          icon={Icon.Bubble}
          shortcut={SHORTCUTS.replies}
          target={<PostFeedList feed={{ kind: "replies", post: post.id }} navigationTitle="Replies" />}
        />
        <Action.Push
          title="View Thread"
          icon={Icon.List}
          shortcut={SHORTCUTS.thread}
          target={<PostFeedList feed={{ kind: "thread", post: post.id }} navigationTitle="Thread" />}
        />
        <Action.Push
          title="View Quotes"
          icon={Icon.QuoteBlock}
          shortcut={SHORTCUTS.quotes}
          target={<PostFeedList feed={{ kind: "quotes", post: post.id }} navigationTitle="Quotes" />}
        />
        {author && (
          <Action.Push
            title="View Author"
            icon={Icon.Person}
            shortcut={SHORTCUTS.author}
            target={<ProfileScreen user={author.username} navigationTitle={`@${author.username}`} />}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Post Link" content={link} shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard
          title="Copy Post Text"
          content={post.text}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        {post.media?.length ? (
          <Action
            title="Download Media"
            icon={Icon.Download}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={() => downloadMedia(post)}
          />
        ) : null}
      </ActionPanel.Section>
      {lastAction && <ActionPanel.Section>{lastAction}</ActionPanel.Section>}
    </ActionPanel>
  );
}
