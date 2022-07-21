import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Project, StorySlim } from "@useshortcut/client";
import { useMemberMap } from "../hooks";
import getOwnersAccessoryItems from "../utils/getOwnersAccessoryItems";
import StoryDetail from "./StoryDetail";

export default function StoryListItem({ project, story }: { project?: Project; story: StorySlim }) {
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
        ].filter(Boolean) as List.Item.Accessory[]
      }
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Sidebar} title="View Story" target={<StoryDetail storyId={story.id} />} />
          <Action.OpenInBrowser url={story.app_url} />
        </ActionPanel>
      }
    />
  );
}
