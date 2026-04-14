import type { TaskVisualTone } from "./task-visuals";
import { getRelativeDueLabel, getRelativeDueTone } from "./tasks";
import type { TaskRecord } from "./types";

export interface MenuBarTaskSubmenuSpec {
  task: TaskRecord;
  dueLabel?: string;
  dueTone?: TaskVisualTone;
}

export interface MenuBarTaskSubmenuSectionSpec {
  title: string;
  items: MenuBarTaskSubmenuSpec[];
}

export function buildMenuBarTaskSubmenuSections(
  currentTask: TaskRecord | undefined,
  menuTasks: TaskRecord[],
): MenuBarTaskSubmenuSectionSpec[] {
  const sections: MenuBarTaskSubmenuSectionSpec[] = [];

  if (currentTask) {
    sections.push({
      title: "Current Task",
      items: [buildMenuBarTaskSubmenuSpec(currentTask)],
    });
  }

  const nextTasks = menuTasks
    .filter((task) => task.id !== currentTask?.id)
    .map(buildMenuBarTaskSubmenuSpec);

  if (nextTasks.length > 0) {
    sections.push({
      title: "Next 5 Tasks",
      items: nextTasks,
    });
  }

  return sections;
}

function buildMenuBarTaskSubmenuSpec(task: TaskRecord): MenuBarTaskSubmenuSpec {
  return {
    task,
    dueLabel: buildDueLabel(task),
    dueTone: getRelativeDueTone(task.dueDate) ?? undefined,
  };
}

function buildDueLabel(task: TaskRecord): string | undefined {
  const relativeDueLabel = getRelativeDueLabel(task.dueDate);
  return relativeDueLabel ?? undefined;
}
