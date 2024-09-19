import { ActionPanel, Icon, List, Action, Image } from "@raycast/api";
import { HashnodeColors } from "../models/Colors";
import { Story } from "../models/Story";

interface StoryItemProps {
  story: Story;
}

export default function StoryItem({ story }: StoryItemProps) {
  return (
    <List.Item
      icon={{
        source: story.author.profilePicture ?? Icon.Circle,
        tintColor: !story.author.profilePicture ? HashnodeColors.PRIMARY : undefined,
        mask: Image.Mask.Circle,
      }}
      title={story.title ?? "No title"}
      actions={<Actions item={story} />}
      accessories={[
        { date: new Date(story.publishedAt) },
        {
          text: `👍  ${story.reactionCount}`,
        },
      ]}
    />
  );
}

function Actions({ item }: { item: Story }) {
  if (item.url) {
    return (
      <ActionPanel title={item.title ?? "No title"}>
        <ActionPanel.Section>
          <Action.OpenInBrowser url={item.url} />
          <Action.OpenInBrowser
            icon={{
              source: item.author.profilePicture ?? Icon.Circle,
              tintColor: HashnodeColors.PRIMARY,
              mask: Image.Mask.Circle,
            }}
            title={`Open ${item.author.username ?? "-"}'s blog`}
            url={item.publication.url}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }
  return null;
}
