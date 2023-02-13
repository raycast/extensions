import { AddTaskArgs, Comment, Project as TProject, Task, UpdateTaskArgs } from "@doist/todoist-api-typescript";
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
import { priorities, ViewMode } from "../constants";
import CreateTask from "../create-task";
import { getAPIDate } from "../helpers/dates";
import { GroupByProp } from "../helpers/groupBy";
import { isTodoistInstalled } from "../helpers/isTodoistInstalled";
import { getProjectIcon } from "../helpers/projects";
import { useFocusedTask } from "../hooks/useFocusedTask";
import { move } from "../sync-api";

import Project from "./Project";
import TaskCommentForm from "./TaskCommentForm";
import TaskComments from "./TaskComments";
import TaskEdit from "./TaskEdit";

interface TaskActionsProps {
  task: Task;
  fromDetail?: boolean;
  projects?: TProject[];
  groupBy?: GroupByProp;
  mode?: ViewMode;
  mutateTasks?: MutatePromise<Task[] | undefined>;
  mutateTaskDetail?: MutatePromise<Task | undefined>;
  mutateComments?: MutatePromise<Comment[] | undefined>;
}

export default function TaskActions({
  task,
  fromDetail,
  projects,
  groupBy,
  mode,
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

  async function moveTask(task: Task, project: TProject) {
    await showToast({ style: Toast.Style.Animated, title: "Moving task", message: project.name });

    try {
      await move(task.id, project.id);
      await showToast({ style: Toast.Style.Success, title: "Moved task", message: project.name });
      mutate();
    } catch (error) {
      handleError({ error, title: `Unable to move task to ${project.name}` });
    }
  }

  async function duplicateTask() {
    await showToast({ style: Toast.Style.Animated, title: "Duplicating task", message: task.content });

    const payload: AddTaskArgs = {
      content: task.content,
      description: task.description,
      projectId: task.projectId,
      sectionId: task.sectionId ? task.sectionId : undefined,
      parentId: task.parentId ? task.parentId : undefined,
      order: task.order,
      labels: task.labels,
      priority: task.priority,
      dueString: task.due?.string,
      dueDate: task.due?.date,
      dueDatetime: task.due && task.due.datetime ? task.due.datetime : undefined,
      assigneeId: task.assigneeId ? task.assigneeId : undefined,
    };

    try {
      await todoist.addTask(payload);
      await showToast({ style: Toast.Style.Success, title: "Duplicated task", message: task.content });
      mutate();
    } catch (error) {
      handleError({ error, title: `Unable to duplicate task` });
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

  const associatedProject = projects?.find((project) => project.id === task.projectId);

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

        {associatedProject && (mode === ViewMode.date || mode === ViewMode.search) ? (
          <Action.Push
            title="Show Project"
            target={<Project project={associatedProject} projects={projects} />}
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          />
        ) : null}

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

        {task.commentCount > 0 ? (
          <Action.Push
            title="Show Comments"
            target={<TaskComments task={task} />}
            icon={Icon.Bubble}
            shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
          />
        ) : null}

        <Action
          title="Duplicate Task"
          icon={Icon.PlusCircle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={duplicateTask}
        />

        {mode === ViewMode.project ? (
          <Action.Push
            title="Add New Task"
            target={<CreateTask fromProjectId={task.projectId} />}
            icon={Icon.NewDocument}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          />
        ) : null}

        <Action
          title="Delete Task"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() => deleteTask(task)}
        />
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

      {groupBy ? (
        <ActionPanel.Section>
          <ActionPanel.Submenu
            title="Group Tasks By"
            icon={Icon.AppWindowGrid3x3}
            shortcut={{ modifiers: ["opt", "shift"], key: "g" }}
          >
            {groupBy.options.map((option) => {
              return (
                <Action
                  key={option.value}
                  title={option.label}
                  icon={option.icon}
                  autoFocus={groupBy.value === option.value}
                  onAction={() => groupBy.setValue(option.value)}
                />
              );
            })}
          </ActionPanel.Submenu>
        </ActionPanel.Section>
      ) : null}
    </>
  );
}
