import { Color, Icon, List } from "@raycast/api";

import type { ProjectRecord, TaskRecord, WorkspaceSummary } from "../api/types";
import { TASK_STATE_ICONS } from "../helpers/constants";
import { getTaskState, isOverdue } from "../helpers/task-helpers";
import { TaskActions } from "./task-actions";

interface TaskListItemProps {
  task: TaskRecord;
  projects: ProjectRecord[];
  revalidate: () => void;
  workspaces?: WorkspaceSummary[];
  showWorkspaceTag?: boolean;
}

export const TaskListItem = ({ task, projects, revalidate, workspaces, showWorkspaceTag }: TaskListItemProps) => {
  const state = getTaskState(task);
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : undefined;
  const overdue = isOverdue(task);

  const accessories: List.Item.Accessory[] = [];

  if (showWorkspaceTag && workspaces) {
    const ws = workspaces.find((w) => w.id === task.workspaceId);
    if (ws) {
      accessories.push({ icon: Icon.Building, tag: ws.name });
    }
  }

  if (project) {
    accessories.push({ icon: Icon.Folder, tag: project.name });
  }

  if (task.deadlineAt) {
    accessories.push({
      date: new Date(task.deadlineAt),
      icon: overdue ? { source: Icon.Warning, tintColor: Color.Red } : undefined,
    });
  }

  return (
    <List.Item
      accessories={accessories}
      actions={<TaskActions projects={projects} revalidate={revalidate} task={task} workspaces={workspaces} />}
      icon={TASK_STATE_ICONS[state]}
      subtitle={task.description?.split("\n")[0] || undefined}
      title={task.title}
    />
  );
};
