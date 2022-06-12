import { ActionPanel, Icon, confirmAlert, showToast, Toast, Action, useNavigation } from "@raycast/api";
import { addDays } from "date-fns";
import { Task, UpdateTaskArgs } from "@doist/todoist-api-typescript";
import { mutate } from "swr";
import { SWRKeys } from "../types";
import { getAPIDate, getToday } from "../helpers";
import { priorities } from "../constants";
import { todoist, handleError } from "../api";
import TaskEdit from "./TaskEdit";
import TaskComments from "./TaskComments";

const schedules = [
  { name: "Today", amount: 0 },
  { name: "Tomorrow", amount: 1 },
  { name: "In two days", amount: 2 },
  { name: "In a week", amount: 7 },
];

interface TaskActionsProps {
  task: Task;
  fromDetail?: boolean;
}

export default function TaskActions({ task, fromDetail }: TaskActionsProps): JSX.Element {
  const { pop } = useNavigation();

  async function completeTask(task: Task) {
    await showToast({ style: Toast.Style.Animated, title: "Completing task" });

    try {
      await todoist.closeTask(task.id);
      await showToast({ style: Toast.Style.Success, title: "Task completed 🙌" });
      mutate(SWRKeys.tasks);

      if (fromDetail) {
        mutate([SWRKeys.task, task.id]);
        pop();
      }
    } catch (error) {
      handleError({ error, title: "Unable to complete task" });
    }
  }

  async function updateTask(task: Task, payload: UpdateTaskArgs) {
    await showToast({ style: Toast.Style.Animated, title: "Updating task" });

    try {
      await todoist.updateTask(task.id, payload);
      await showToast({ style: Toast.Style.Success, title: "Task updated" });
      mutate(SWRKeys.tasks);

      if (fromDetail) {
        mutate([SWRKeys.task, task.id]);
      }
    } catch (error) {
      handleError({ error, title: "Unable to update task" });
    }
  }

  async function deleteTask(task: Task) {
    if (await confirmAlert({ title: "Are you sure you want to delete this task?" })) {
      await showToast({ style: Toast.Style.Animated, title: "Deleting task" });

      try {
        await todoist.deleteTask(task.id);
        await showToast({ style: Toast.Style.Success, title: "Task deleted" });

        mutate(SWRKeys.tasks);

        if (fromDetail) {
          mutate([SWRKeys.task, task.id]);
          pop();
        }
      } catch (error) {
        handleError({ error, title: "Unable to delete task" });
      }
    }
  }

  return (
    <>
      <Action.OpenInBrowser url={task.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />

      <ActionPanel.Section>
        <Action.Push
          title="Edit Task"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<TaskEdit task={task} />}
        />

        <Action
          id="completeTask"
          title="Complete Task"
          icon={Icon.Checkmark}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={() => completeTask(task)}
        />

        <ActionPanel.Submenu icon={Icon.Calendar} title="Schedule" shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}>
          {schedules.map(({ name, amount }) => (
            <Action
              key={name}
              id={name}
              title={name}
              onAction={() => updateTask(task, { dueDate: getAPIDate(addDays(getToday(), amount)) })}
            />
          ))}

          <Action title="No due date" onAction={() => updateTask(task, { dueString: "no due date" })} />
        </ActionPanel.Submenu>

        <ActionPanel.Submenu
          icon={Icon.LevelMeter}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          title="Change Priority"
        >
          {priorities.map(({ value, name, color, icon }) => (
            <Action
              key={name}
              id={name}
              title={name}
              icon={{ source: icon, tintColor: color }}
              onAction={() => updateTask(task, { priority: value })}
            />
          ))}
        </ActionPanel.Submenu>

        <Action
          id="deleteTask"
          title="Delete Task"
          icon={Icon.Trash}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() => deleteTask(task)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        {task.commentCount > 0 ? (
          <Action.Push
            title="Show Comments"
            target={<TaskComments task={task} />}
            icon={Icon.Bubble}
            shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
          />
        ) : null}

        <Action.CopyToClipboard
          title="Copy Task URL"
          content={task.url}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />

        <Action.CopyToClipboard
          title="Copy Task Title"
          content={task.content}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
      </ActionPanel.Section>
    </>
  );
}
