import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Project, Story, StorySlim } from "@useshortcut/client";

export default function StoryListItem({ project, story }: { project?: Project; story: StorySlim }) {
  return (
    <List.Item
      key={story.id}
      title={story.name}
      icon={Icon.Ellipsis}
      subtitle={String(story.id)}
      accessories={
        [
          project && {
            icon: {
              source: Icon.CircleFilled,
              tintColor: project.color,
            },
          },
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
