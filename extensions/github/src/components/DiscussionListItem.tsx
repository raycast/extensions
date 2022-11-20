import { List, Icon, Color, ActionPanel, Action, Image } from "@raycast/api";

import { DiscussionFieldsFragment } from "../generated/graphql";

function getDiscussionIcon(discussion: DiscussionFieldsFragment):
  | {
      value: Image.ImageLike | undefined | null;
      tooltip: string;
    }
  | Image.ImageLike
  | undefined {
  const categoryText = discussion.category?.name ? `Category: ${discussion.category?.name}` : "";
  const emojiHTML = discussion.category?.emojiHTML as string | null | undefined;
  if (!emojiHTML) {
    return { value: { source: discussion.repository?.owner?.avatarUrl }, tooltip: categoryText };
  }
  const fallbackImage = () => {
    // note: getting the emoji directly break raycast. Looks like encoding issues.
    const re = /fallback-src="(.*)"/;
    const match = emojiHTML.match(re);
    if (match) {
      return match[1];
    }
    return undefined;
  };
  const fb = fallbackImage();
  if (fb) {
    return {
      value: { source: fb },
      tooltip: categoryText,
    };
  }
  return fb;
}

export function DiscussionListItem(props: { discussion: DiscussionFieldsFragment }): JSX.Element {
  const d = props.discussion;
  return (
    <List.Item
      icon={getDiscussionIcon(d)}
      title={d.title}
      subtitle={d.repository?.nameWithOwner}
      accessories={[
        {
          icon: { source: d.answer ? Icon.Checkmark : "", tintColor: Color.Green },
          tooltip: d.answer ? "Answered" : undefined,
        },
        {
          icon: { source: Icon.ArrowUp, tintColor: Color.Purple },
          text: `${d.upvoteCount}`,
          tooltip: `${d.upvoteCount} Upvotes`,
        },
        {
          text: d.comments ? `${d.comments.totalCount}` : undefined,
          icon: d.comments ? Icon.SpeechBubble : undefined,
          tooltip: d.comments ? `Comments: ${d.comments.totalCount}` : undefined,
        },
        { date: new Date(d.publishedAt) },
        { icon: { source: d.author?.avatarUrl, mask: Image.Mask.Circle }, tooltip: d.author?.login },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={d.url} />
        </ActionPanel>
      }
    />
  );
}
