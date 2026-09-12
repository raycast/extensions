import {
  ActionPanel,
  Action,
  Icon,
  List,
  launchCommand,
  LaunchType,
  Color,
  LaunchProps,
  useNavigation,
} from "@raycast/api";
import { provider, reauthorize } from "./lib/oauth";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { useTasks } from "./hooks/useTasks";
import { TaskItem } from "./components";
import { TaskLogsList } from "./components/TaskLogsList";
import { useEffect, useRef } from "react";

interface LaunchContext {
  taskId?: string;
}

function Command(props: LaunchProps<{ launchContext: LaunchContext }>) {
  const { isLoading, tasks } = useTasks();
  const { push } = useNavigation();
  const hasNavigated = useRef(false);
  const targetTaskId = props.launchContext?.taskId;

  // Auto-navigate to the target task's logs when launched with context
  useEffect(() => {
    if (hasNavigated.current || isLoading || !targetTaskId) return;
    const target = tasks.find((t) => t.task.id === targetTaskId);
    if (target) {
      hasNavigated.current = true;
      push(<TaskLogsList taskWithPullRequest={target} />);
    }
  }, [isLoading, tasks, targetTaskId, push]);

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
