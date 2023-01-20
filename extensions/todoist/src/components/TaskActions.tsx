import { Comment, Project, Task, UpdateTaskArgs } from "@doist/todoist-api-typescript";
import {
  ActionPanel,
  Icon,
  confirmAlert,
  showToast,
  Toast,
  Action,
  useNavigation,
  Color,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { MutatePromise } from "@raycast/utils";

import { todoist, handleError } from "../api";
import { priorities } from "../constants";
import { getAPIDate } from "../helpers/dates";
import { isTodoistInstalled } from "../helpers/isTodoistInstalled";
import { getProjectIcon } from "../helpers/projects";
import { useFocusedTask } from "../hooks/useFocusedTask";
import { move } from "../sync-api";

import TaskCommentForm from "./TaskCommentForm";
import TaskComments from "./TaskComments";
import TaskEdit from "./TaskEdit";

interface TaskActionsProps {
  task: Task;
  fromDetail?: boolean;
  projects?: Project[];
  mutateTasks?: MutatePromise<Task[] | undefined>;
  mutateTaskDetail?: MutatePromise<Task | undefined>;
  mutateComments?: MutatePromise<Comment[] | undefined>;
}

export default function TaskActions({
  task,
  fromDetail,
  projects,
  mutateTasks,
  mutateTaskDetail,
  mutateComments,
}: TaskActionsProps): JSX.Element {
  const { pop } = useNavigation();

  const { focusedTask, focusTask, unfocusTask } = useFocusedTask();

  async function mutate({ withPop = false } = {}) {
    if (mutateTasks) {
      await mutateTasks();
    }

    if (mutateTaskDetail) {
      await mutateTaskDetail();
    }

    if (fromDetail && withPop) {
      pop();
    }
  }

  async function refreshMenuBarCommand() {
    await launchCommand({ name: "menubar", type: LaunchType.UserInitiated });
  }

  async function completeTask(task: Task) {
    await showToast({ style: Toast.Style.Animated, title: "Completing task" });

    try {
      await todoist.closeTask(task.id);
      await showToast({ style: Toast.Style.Success, title: "Task completed 🙌" });

      if (focusedTask.id === task.id) {
        unfocusTask();
        refreshMenuBarCommand();
      }

      mutate({ withPop: true });
    } catch (error) {
      handleError({ error, title: "Unable to complete task" });
    }
  }

  async function updateTask(task: Task, payload: UpdateTaskArgs) {
    await showToast({ style: Toast.Style.Animated, title: "Updating task" });

    try {
      await todoist.updateTask(task.id, payload);
      await showToast({ style: Toast.Style.Success, title: "Task updated" });
      mutate();
    } catch (error) {
      handleError({ error, title: "Unable to update task" });
    }
  }

  async function moveTask(task: Task, project: Project) {
    await showToast({ style: Toast.Style.Animated, title: `Moving task to ${project.name}` });

    try {
      await move(task.id, project.id);
      await showToast({ style: Toast.Style.Success, title: `Moved task to ${project.name}` });
      mutate();
    } catch (error) {
      handleError({ error, title: `Unable to move task to ${project.name}` });
    }
  }

  async function deleteTask(task: Task) {
    if (
      await confirmAlert({
        title: "Delete Task",
        message: "Are you sure you want to delete this task?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      await showToast({ style: Toast.Style.Animated, title: "Deleting task" });

      try {
        await todoist.deleteTask(task.id);
        await showToast({ style: Toast.Style.Success, title: "Task deleted" });

        mutate({ withPop: true });
      } catch (error) {
        handleError({ error, title: "Unable to delete task" });
      }
    }
  }

  return (
    <>
      {isTodoistInstalled ? (
        <Action.Open
          title="Open Task in Todoist"
          target={`todoist://task?id=${task.id}`}
          icon="todoist.png"
          application="Todoist"
        />
      ) : (
        <Action.OpenInBrowser title="Open Task in Browser" url={task.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
      )}

      <ActionPanel.Section>
        {focusedTask.id !== task.id ? (
          <Action
            title="Focus Task"
            icon={Icon.Center}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => {
              focusTask(task);
              refreshMenuBarCommand();
            }}
          />
        ) : (
          <Action
            title="Unfocus Task"
            icon={Icon.MinusCircle}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => {
              unfocusTask();
              refreshMenuBarCommand();
            }}
          />
        )}

        <Action.Push
          title="Edit Task"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<TaskEdit task={task} mutateTasks={mutateTasks} mutateTaskDetail={mutateTaskDetail} />}
        />

        <Action
          title="Complete Task"
          icon={Icon.Checkmark}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={() => completeTask(task)}
        />

        <Action.PickDate
          title="Schedule"
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onChange={(date) => updateTask(task, date ? { dueDate: getAPIDate(date) } : { dueString: "no due date" })}
        />

        <ActionPanel.Submenu
          icon={Icon.LevelMeter}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          title="Change Priority"
        >
          {priorities.map(({ value, name, color, icon }) => (
            <Action
              key={name}
              title={name}
              icon={{ source: icon, tintColor: color }}
              onAction={() => updateTask(task, { priority: value })}
            />
          ))}
        </ActionPanel.Submenu>

        {projects ? (
          <ActionPanel.Submenu
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            title="Move to Project"
          >
            {projects.map((project) => (
              <Action
                key={project.id}
                title={project.name}
                icon={getProjectIcon(project)}
                onAction={() => moveTask(task, project)}
              />
            ))}
          </ActionPanel.Submenu>
        ) : null}

        <Action.Push
          title="Add New Comment"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          target={<TaskCommentForm task={task} mutateComments={mutateComments} mutateTasks={mutateTasks} />}
        />

        <Action
          title="Delete Task"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
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
      </ActionPanel.Section>

      <ActionPanel.Section>
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
