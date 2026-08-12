import { Icon, MenuBarExtra, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { completeTask } from "./api/mutations";
import { useTasks } from "./hooks/use-tasks";
import { useWorkspaces } from "./hooks/use-workspaces";
import { oauthService } from "./oauth";

const MenuBarToday = () => {
  const { workspaceId, allWorkspaceIds, isLoading: isLoadingWorkspace } = useWorkspaces();
  const { tasks, isLoading: isLoadingTasks, revalidate } = useTasks(workspaceId, "today", allWorkspaceIds);

  const isLoading = isLoadingWorkspace || isLoadingTasks;
  const title = isLoading ? "" : `${tasks.length}`;

  return (
    <MenuBarExtra icon={Icon.Star} isLoading={isLoading} title={title} tooltip="Done Bear - Today">
      <MenuBarExtra.Section title="Today's Tasks">
        {tasks.map((task) => {
          // oxlint-disable-next-line jsx-no-new-function-as-prop -- handler in map body
          const handleAction = async () => {
            try {
              await showToast({
                style: Toast.Style.Animated,
                title: "Completing task...",
              });
              await completeTask(task.id);
              await showToast({
                style: Toast.Style.Success,
                title: "Task completed",
              });
              revalidate();
            } catch (error) {
              await showToast({
                message: error instanceof Error ? error.message : "Unknown error",
                style: Toast.Style.Failure,
                title: "Failed to complete task",
              });
            }
          };
          return <MenuBarExtra.Item icon={Icon.Circle} key={task.id} onAction={handleAction} title={task.title} />;
        })}
      </MenuBarExtra.Section>
      {tasks.length === 0 && !isLoading && <MenuBarExtra.Item title="No tasks for today" />}
    </MenuBarExtra>
  );
};

export default withAccessToken(oauthService)(MenuBarToday);
