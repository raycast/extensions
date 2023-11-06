import { ReactNode, useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "./utils/errors";
import { HelpError, ScheduledTask, TaskState, fetchScheduledTasks, signalTask } from "./utils/jellyfinApi";
import { editToast } from "./utils/utils";
import ErrorDetailView from "./components/ErrorDetailView";
import { getProgressIcon } from "@raycast/utils";

const sections: TaskState[] = ["Running", "Idle"];

function TaskListItem({ task, refresh }: { task: ScheduledTask; refresh: () => void }): JSX.Element {
  let color: Color = Color.SecondaryText;
  let icon: Image.ImageLike = Icon.Heartbeat;

  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: task.Category,
        color: Color.Purple,
      },
    },
  ];

  const actions: ReactNode[] = [];

  if (task.State == "Running") {
    color = Color.Orange;
    icon = Icon.Bolt;

    accessories.push({
      icon: getProgressIcon((task.CurrentProgressPercentage ?? 0) / 100),
      tooltip: `${Math.round(task.CurrentProgressPercentage ?? 0)}%`,
    });

    actions.push(
      <Action
        title="Cancel Task"
        style={Action.Style.Destructive}
        icon={Icon.Stop}
        shortcut={{ key: "backspace", modifiers: ["cmd"] }}
        onAction={async () => {
          const toast = await showToast({
            title: "Task",
            message: `Cancelling ${task.Name}...`,
            style: Toast.Style.Animated,
          });

          try {
            if (!(await signalTask(task.Id, "DELETE"))) {
              throw new Error("server returned error");
            }
            editToast(toast, `Task ${task.Name} cancelled.`, Toast.Style.Success);
            refresh();
          } catch (e) {
            editToast(toast, getErrorMessage(e), Toast.Style.Failure);
          }
        }}
      />
    );
  } else {
    actions.push(
      <Action
        title="Start Task"
        icon={Icon.Play}
        shortcut={{ key: "enter", modifiers: ["cmd", "shift"] }}
        onAction={async () => {
          const toast = await showToast({
            title: "Task",
            message: `Starting ${task.Name}...`,
            style: Toast.Style.Animated,
          });

          try {
            if (!(await signalTask(task.Id, "POST"))) {
              throw new Error("server returned error");
            }
            editToast(toast, `Task ${task.Name} started.`, Toast.Style.Success);
            refresh();
          } catch (e) {
            editToast(toast, getErrorMessage(e), Toast.Style.Failure);
          }
        }}
      />
    );
  }

  return (
    <List.Item
      title={task.Name}
      subtitle={task.Description}
      icon={{
        source: icon,
        tintColor: color,
      }}
      accessories={accessories}
      actions={<ActionPanel title="Task Actions">{...actions}</ActionPanel>}
    />
  );
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [error, setError] = useState<string>("");

  async function refresh() {
    try {
      const newTasks = await fetchScheduledTasks();
      setTasks(newTasks);
    } catch (e) {
      if (e instanceof HelpError) {
        setError(e.helpMessage);
      }
      showToast({ title: "Error", message: getErrorMessage(e), style: Toast.Style.Failure });
    }
  }

  useEffect(() => {
    setIsLoading(true);
    refresh().then(() => setIsLoading(false));
    const interval = setInterval(() => refresh(), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ErrorDetailView errorMessage={error}>
      <List isLoading={isLoading}>
        {sections.map((section, sectionIndex) => (
          <List.Section key={sectionIndex} title={section}>
            {tasks
              .filter((task) => task.State == section)
              .map((task, taskIndex) => (
                <TaskListItem key={taskIndex} task={task} refresh={refresh} />
              ))}
          </List.Section>
        ))}
        <List.EmptyView title="No Scheduled Tasks found on Jellyfin" />
      </List>
    </ErrorDetailView>
  );
}
