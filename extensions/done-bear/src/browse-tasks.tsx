import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import type { NavigableView } from "./api/types";
import { QuickAddAction } from "./components/quick-add-action";
import TaskList from "./components/task-list";
import { useWorkspaceDropdown } from "./components/with-workspace";
import { VIEW_CONFIG } from "./helpers/constants";
import { matchesView } from "./helpers/task-helpers";
import { useTasks } from "./hooks/use-tasks";
import { oauthService } from "./oauth";

const VIEWS: Array<{ description: string; view: NavigableView }> = [
  { description: "Planned for today", view: "today" },
  { description: "Captured for review", view: "inbox" },
  { description: "Available whenever", view: "anytime" },
  { description: "Scheduled for later", view: "upcoming" },
  { description: "Ideas for another day", view: "someday" },
];

const BrowseTasks = () => {
  const { workspaceId, allWorkspaceIds, isLoading: isLoadingWorkspace, dropdown } = useWorkspaceDropdown();
  const { tasks, error, isLoading: isLoadingTasks, revalidate } = useTasks(workspaceId, undefined, allWorkspaceIds);

  return (
    <List
      isLoading={isLoadingWorkspace || isLoadingTasks}
      searchBarAccessory={dropdown}
      searchBarPlaceholder="Filter task lists..."
    >
      {error ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} onAction={revalidate} title="Retry" />
            </ActionPanel>
          }
          description="Check your connection and try again."
          icon={Icon.Warning}
          title="Task lists couldn't load"
        />
      ) : (
        VIEWS.map(({ description, view }) => {
          const config = VIEW_CONFIG[view];
          const taskCount = tasks.filter((task) => matchesView(task, view)).length;

          return (
            <List.Item
              accessories={[{ text: `${taskCount}` }]}
              actions={
                <ActionPanel>
                  <Action.Push icon={config.icon} target={<TaskList view={view} />} title={`Open ${config.title}`} />
                  <QuickAddAction fallbackView={view} onCreated={revalidate} />
                </ActionPanel>
              }
              icon={{ source: config.icon, tintColor: config.color }}
              key={view}
              subtitle={description}
              title={config.title}
            />
          );
        })
      )}
    </List>
  );
};

export default withAccessToken(oauthService)(BrowseTasks);
