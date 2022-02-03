import { ActionPanel, Icon, ImageMask, List, OpenInBrowserAction } from "@raycast/api";
import { HashnodeColors } from "models/Colors";
import { Story } from "models/Story";
import React from "react";

interface StoryItemProps {
  story: Story;
}

export default function StoryItem({ story }: StoryItemProps) {
  return (
    <List.Item
      icon={{
        source: story?.author?.photo ?? Icon.Circle,
        tintColor: HashnodeColors.PRIMARY,
        mask: ImageMask.Circle,
      }}
      title={story.title ?? "No title"}
      accessoryTitle={`📅  ${story.dateAdded.substring(0, 10)} 👍  ${story.totalReactions}`}
      actions={<Actions item={story} />}
    />
  );
}

function Actions({ item }: { item: Story }) {
  if ((item?.author?.publicationDomain || item?.author?.blogHandle) && item?.slug) {
    const blogBaseUrl = item?.author?.publicationDomain
      ? `https://${item.author.publicationDomain}`
      : `https://${item.author.blogHandle}.hashnode.dev`;
    const postUrl = `${blogBaseUrl}/${item.slug}`;

    return (
      <ActionPanel title={item.title ?? "No title"}>
        <ActionPanel.Section>
          <OpenInBrowserAction url={postUrl} />
          <OpenInBrowserAction
            icon={{
              source: item?.author?.photo ?? Icon.Circle,
              tintColor: HashnodeColors.PRIMARY,
              mask: ImageMask.Circle,
            }}
            title={`Open ${item?.author?.username ?? "-"}'s blog`}
            url={blogBaseUrl}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }
  return null;
}
