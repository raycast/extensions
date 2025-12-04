import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Project, Story, StorySlim } from "@useshortcut/client";
import { useMemberMap } from "../hooks";
import { getOwnersAccessoryItems, getStoryColor } from "../helpers/storyHelpers";
import StoryDetail from "./StoryDetail";
import StoryActions from "./StoryActions";

export default function StoryListItem({
  project,
  story,
  mutate,
}: {
  project?: Project;
  story: StorySlim | Story;
  mutate?: () => void;
}) {
  const memberMap = useMemberMap();
  const owners = story.owner_ids.map((ownerId) => memberMap?.[ownerId]);

  return (
    <List.Item
      key={story.id}
      title={story.name}
      icon={Icon.Ellipsis}
      subtitle={`#${story.id}`}
      accessories={
        [
          story.estimate &&
            ({
              text: story.estimate.toString(),
              tooltip: "Estimate",
            } as List.Item.Accessory),

          ...getOwnersAccessoryItems(owners),

          project
            ? {
                icon: {
                  source: Icon.CircleFilled,
                  tintColor: project.color,
                },
                tooltip: project.name,
              }
            : ({
                icon: Icon.Circle,
                tooltip: "No project",
              } as List.Item.Accessory),

          story.story_type &&
            ({
              icon: {
                source: Icon.Dot,
                tintColor: getStoryColor(story.story_type),
              },
              tooltip: story.story_type,
            } as List.Item.Accessory),
        ].filter(Boolean) as List.Item.Accessory[]
      }
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Sidebar}
            title="View Story"
            target={<StoryDetail storyId={story.id} mutate={mutate} />}
          />

          <StoryActions
            mutate={async () => {
              if (mutate) {
                mutate();
              }
            }}
            story={story}
          />
        </ActionPanel>
      }
    />
  );
}
