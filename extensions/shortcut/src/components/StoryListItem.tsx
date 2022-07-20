import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Project, StorySlim } from "@useshortcut/client";

export default function StoryListItem({ project, story }: { project?: Project; story: StorySlim }) {
  return (
    <List.Item
      key={story.id}
      title={story.name}
      icon={Icon.Ellipsis}
      subtitle={`#${story.id}`}
      accessories={
        [
          story.estimate && {
            icon: `number-${story.estimate.toString().padStart(2, "0")}-16`,
          },
          project
            ? {
                icon: {
                  source: Icon.CircleFilled,
                  tintColor: project.color,
                },
              }
            : Icon.Circle,
        ].filter(Boolean) as List.Item.Accessory[]
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={story.app_url} />
        </ActionPanel>
      }
    />
  );
}
