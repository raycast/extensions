import { ActionPanel, Action, Icon, List, launchCommand, LaunchType, Color } from "@raycast/api";
import { provider, reauthorize } from "./lib/oauth";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { useTasks } from "./hooks/useTasks";
import { TaskItem } from "./components";

function Command() {
  const { isLoading, tasks } = useTasks();

  // Filter tasks by pull request state (if available)
  const openTasks = tasks.filter(
    (taskWithPullRequest) => !taskWithPullRequest.pullRequest || taskWithPullRequest.pullRequest.state === "OPEN",
  );
  const closedTasks = tasks.filter(
    (taskWithPullRequest) => taskWithPullRequest.pullRequest && taskWithPullRequest.pullRequest.state !== "OPEN",
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks..."
      actions={
        <ActionPanel>
          <Action
            title="New Task"
            icon={Icon.NewDocument}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "create-task",
                  type: LaunchType.UserInitiated,
                });
              } catch (error) {
                await showFailureToast(error, {
                  title: "Failed to open Create Task",
                });
              }
            }}
          />
          <Action title="Log out" icon={Icon.Logout} onAction={reauthorize} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={{ source: "copilot.svg", tintColor: Color.PrimaryText }}
        title={tasks.length === 0 ? "No Tasks Found" : "No Matching Tasks"}
        description={tasks.length === 0 ? "Press Return to create your first task" : "Try a different search"}
      />
      {openTasks.length > 0 && (
        <List.Section title="Open">
          {openTasks.map((taskWithPullRequest) => (
            <TaskItem key={taskWithPullRequest.key} taskWithPullRequest={taskWithPullRequest} />
          ))}
        </List.Section>
      )}
      {closedTasks.length > 0 && (
        <List.Section title="Closed">
          {closedTasks.map((taskWithPullRequest) => (
            <TaskItem key={taskWithPullRequest.key} taskWithPullRequest={taskWithPullRequest} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default withAccessToken(provider)(Command);
