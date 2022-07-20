import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemberInfo, useAssignedStories, useProjectMap } from "./hooks";
import { Project } from "@useshortcut/client";

export default function AssignedStories() {
  const { data: memberInfo } = useMemberInfo();
  const projectIdMap = useProjectMap();
  const { data: assignedStories, isValidating } = useAssignedStories(memberInfo?.mention_name);

  return (
    <List isLoading={!assignedStories || isValidating}>
      {assignedStories?.data.map((story) => {
        const storyProject: Project | undefined = projectIdMap[story.project_id!];

        return (
          <List.Item
            key={story.id}
            title={story.name}
            icon={Icon.Ellipsis}
            subtitle={String(story.id)}
            accessories={[
              storyProject && {
                text: storyProject.name || "",
                icon: {
                  source: Icon.CircleFilled,
                  tintColor: storyProject.color,
                },
              },
            ].filter(Boolean)}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={story.app_url} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
