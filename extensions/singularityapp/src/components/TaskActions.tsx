import { Action, ActionPanel, Color, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  Task,
  Project,
  updateTask,
  deleteTask,
  completeTask,
  uncompleteTask,
  getProjectIcon,
  getAPIDateString,
} from "../api";
import TaskUpdater from "./TaskUpdater";
import { PRIORITIES } from "../utils/priorities";

type TaskActionsProps = {
  task: Task;
  projects?: Project[];
  onTaskUpdated?: () => void;
};

export default function TaskActions({ task, projects, onTaskUpdated }: TaskActionsProps) {
  async function handleCompleteTask() {
    await showToast({ style: Toast.Style.Animated, title: "Completing task" });

    try {
      await completeTask(task.id);
      await showToast({ style: Toast.Style.Success, title: "Task completed 🙌" });
      onTaskUpdated?.();
    } catch (error) {
      await showFailureToast(error, { title: "Unable to complete task" });
    }
  }

  async function handleUncompleteTask() {
    await showToast({ style: Toast.Style.Animated, title: "Uncompleting task" });

    try {
      await uncompleteTask(task.id);
      await showToast({ style: Toast.Style.Success, title: "Task uncompleted" });
      onTaskUpdated?.();
    } catch (error) {
      await showFailureToast(error, { title: "Unable to uncomplete task" });
    }
  }

  async function handleUpdatePriority(priority: number) {
    await showToast({ style: Toast.Style.Animated, title: "Updating priority" });

    try {
      await updateTask(task.id, { priority });
      await showToast({ style: Toast.Style.Success, title: "Priority updated" });
      onTaskUpdated?.();
    } catch (error) {
      await showFailureToast(error, { title: "Unable to update priority" });
    }
  }

  async function handleScheduleTask(date: Date | null) {
    await showToast({ style: Toast.Style.Animated, title: "Scheduling task" });

    try {
      await updateTask(task.id, { start: date ? getAPIDateString(date) : null });
      await showToast({ style: Toast.Style.Success, title: date ? "Task scheduled" : "Schedule removed" });
      onTaskUpdated?.();
    } catch (error) {
      await showFailureToast(error, { title: "Unable to schedule task" });
    }
  }

  async function handleSetDeadline(date: Date | null) {
    await showToast({ style: Toast.Style.Animated, title: "Setting deadline" });

    try {
      await updateTask(task.id, { deadline: date ? getAPIDateString(date) : null });
      await showToast({ style: Toast.Style.Success, title: date ? "Deadline set" : "Deadline removed" });
      onTaskUpdated?.();
    } catch (error) {
      await showFailureToast(error, { title: "Unable to set deadline" });
    }
  }

  async function handleMoveToProject(projectId: string | null) {
    await showToast({ style: Toast.Style.Animated, title: "Moving task" });

    try {
      await updateTask(task.id, { projectId });
      await showToast({ style: Toast.Style.Success, title: "Task moved" });
      onTaskUpdated?.();
    } catch (error) {
      await showFailureToast(error, { title: "Unable to move task" });
    }
  }

  async function handleDeleteTask() {
    if (
      await confirmAlert({
        title: "Delete Task",
        message: "Are you sure you want to delete this task?",
        icon: { source: Icon.Trash, tintColor: Color.Red },
      })
    ) {
      await showToast({ style: Toast.Style.Animated, title: "Deleting task" });

      try {
        await deleteTask(task.id);
        await showToast({ style: Toast.Style.Success, title: "Task deleted" });
        onTaskUpdated?.();
      } catch (error) {
        await showFailureToast(error, { title: "Unable to delete task" });
      }
    }
  }

  const isCompleted = task.checked === 1 || task.complete === 1;
  const taskTitle = task.title || "(Untitled task)";

  return (
    <>
      {isCompleted ? (
        <Action title="Uncomplete Task" icon={Icon.Circle} onAction={handleUncompleteTask} />
      ) : (
        <Action title="Complete Task" icon={Icon.Checkmark} onAction={handleCompleteTask} />
      )}

      <Action.Push
        title="Update Task"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        target={<TaskUpdater task={task} projects={projects} onTaskUpdated={onTaskUpdated} />}
      />

      <ActionPanel.Section>
        <Action.PickDate
          title="Schedule Task"
          icon={Icon.Calendar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onChange={handleScheduleTask}
        />

        <Action.PickDate
          title="Set Deadline"
          icon={Icon.Flag}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onChange={handleSetDeadline}
        />

        <ActionPanel.Submenu
          icon={Icon.LevelMeter}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          title="Change Priority"
        >
          {PRIORITIES.map(({ value, name, color, icon }) => (
            <Action
              key={name}
              title={name}
              icon={{ source: icon, tintColor: color }}
              onAction={() => handleUpdatePriority(value)}
            />
          ))}
        </ActionPanel.Submenu>

        {projects && projects.length > 0 && (
          <ActionPanel.Submenu
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            title="Move to Project"
          >
            <Action title="No Project (Inbox)" icon={Icon.Tray} onAction={() => handleMoveToProject(null)} />
            {projects.map((project) => (
              <Action
                key={project.id}
                title={project.title}
                icon={getProjectIcon(project)}
                onAction={() => handleMoveToProject(project.id)}
              />
            ))}
          </ActionPanel.Submenu>
        )}

        <Action
          title="Delete Task"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={handleDeleteTask}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Task Title"
          content={taskTitle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
        {task.note && (
          <Action.CopyToClipboard
            title="Copy Task Note"
            content={task.note}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          />
        )}
      </ActionPanel.Section>
    </>
  );
}
