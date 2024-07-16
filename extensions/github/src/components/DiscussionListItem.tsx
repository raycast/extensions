import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { format } from "date-fns";

import { DiscussionFieldsFragment } from "../generated/graphql";
import { DISCUSSION_SORT_TYPES_TO_QUERIES } from "../helpers/discussion";
import { getGitHubUser } from "../helpers/users";

import { SortAction, SortActionProps } from "./SortAction";

function getDiscussionIcon(discussion: DiscussionFieldsFragment): List.Item.Props["icon"] {
  const categoryText = discussion.category?.name ? `Category: ${discussion.category?.name}` : "Unknown";
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

export function DiscussionListItem(props: { discussion: DiscussionFieldsFragment } & SortActionProps): JSX.Element {
  const d = props.discussion;
  const user = getGitHubUser(d.author);
  return (
    <List.Item
      icon={getDiscussionIcon(d)}
      title={d.title}
      subtitle={d.repository?.nameWithOwner}
      accessories={[
        {
          icon: d.answer ? { source: Icon.Checkmark, tintColor: Color.Green } : undefined,
          tooltip: d.answer ? "Answered" : undefined,
        },
        {
          icon: Icon.ArrowUp,
          text: `${d.upvoteCount}`,
          tooltip: `${d.upvoteCount} Upvotes`,
        },
        {
          text: d.comments ? `${d.comments.totalCount}` : undefined,
          icon: d.comments ? Icon.SpeechBubble : undefined,
          tooltip: d.comments ? `Comments: ${d.comments.totalCount}` : undefined,
        },
        {
          date: new Date(d.publishedAt),
          tooltip: d.publishedAt ? format(new Date(d.publishedAt), "EEEE d MMMM yyyy 'at' HH:mm") : undefined,
        },
        { icon: user.icon, tooltip: user.text },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={d.url} />
          <ActionPanel.Section>
            <SortAction data={DISCUSSION_SORT_TYPES_TO_QUERIES} {...props} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
