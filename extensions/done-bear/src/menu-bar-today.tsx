import { Icon, LaunchType, MenuBarExtra, launchCommand, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { completeTask } from "./api/mutations";
import { revalidateAfterMutation } from "./helpers/revalidate";
import { useTasks } from "./hooks/use-tasks";
import { useWorkspaces } from "./hooks/use-workspaces";
import { oauthService } from "./oauth";

const MenuBarToday = () => {
  const { workspaceId, allWorkspaceIds, isLoading: isLoadingWorkspace } = useWorkspaces();
  const { tasks, error, isLoading: isLoadingTasks, revalidate } = useTasks(workspaceId, "today", allWorkspaceIds);

  const isLoading = isLoadingWorkspace || isLoadingTasks;
  const title = isLoading ? "" : `${tasks.length}`;

  return (
    <MenuBarExtra icon={Icon.Star} isLoading={isLoading} title={title} tooltip="Done Bear - Today">
      <MenuBarExtra.Section title="Today's Tasks">
        {tasks.map((task) => {
          // oxlint-disable-next-line jsx-no-new-function-as-prop -- handler in map body
          const handleAction = async () => {
            await showToast({
              style: Toast.Style.Animated,
              title: "Completing task...",
            });
            try {
              await completeTask(task.id);
            } catch {
              await showToast({
                message: "Check your connection and try again.",
                style: Toast.Style.Failure,
                title: "Couldn't complete task",
              });
              return;
            }

            await showToast({
              style: Toast.Style.Success,
              title: "Task completed",
            });
            await revalidateAfterMutation(revalidate);
          };
          return <MenuBarExtra.Item icon={Icon.Circle} key={task.id} onAction={handleAction} title={task.title} />;
        })}
      </MenuBarExtra.Section>
      {error && !isLoading && (
        <MenuBarExtra.Item icon={Icon.Warning} onAction={revalidate} title="Couldn't load Today — Retry" />
      )}
      {tasks.length === 0 && !isLoading && !error && <MenuBarExtra.Item title="Today is clear" />}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        icon={Icon.Stars}
        onAction={() => launchCommand({ name: "quick-add-task", type: LaunchType.UserInitiated })}
        title="Create Task…"
      />
      <MenuBarExtra.Item
        icon={Icon.List}
        onAction={() => launchCommand({ name: "show-today", type: LaunchType.UserInitiated })}
        title="Open Today List"
      />
    </MenuBarExtra>
  );
};

export default withAccessToken(oauthService)(MenuBarToday);
