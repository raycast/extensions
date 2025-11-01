import { ActionPanel, Icon, List, Action, Image, Keyboard } from "@raycast/api";
import { HashnodeColors } from "../models/Colors";
import { Story } from "../models/Story";
import { useCachedState } from "@raycast/utils";

interface StoryItemProps {
  story: Story;
}

export default function StoryItem({ story }: StoryItemProps) {
  const [isShowingDetail] = useCachedState("is-showing-detail", false);
  return (
    <List.Item
      icon={{
        source: story.author.profilePicture ?? Icon.Circle,
        tintColor: !story.author.profilePicture ? HashnodeColors.PRIMARY : undefined,
        mask: Image.Mask.Circle,
      }}
      title={story.title ?? "No title"}
      actions={<Actions item={story} />}
      accessories={
        isShowingDetail
          ? undefined
          : [
              { date: new Date(story.publishedAt) },
              {
                text: `👍  ${story.reactionCount}`,
              },
            ]
      }
      detail={
        <List.Item.Detail
          markdown={story.brief}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Link
                title="Publication"
                text={story.publication.title}
                target={story.publication.url}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function Actions({ item }: { item: Story }) {
  const [, setIsShowingDetail] = useCachedState("is-showing-detail", false);
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
        <Action
          icon={Icon.AppWindowSidebarLeft}
          title="Toggle Details"
          onAction={() => setIsShowingDetail((prev) => !prev)}
          shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
        />
      </ActionPanel>
    );
  }
  return null;
}
