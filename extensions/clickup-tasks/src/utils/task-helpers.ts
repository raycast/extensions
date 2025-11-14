import { ClickUpTask } from "../types/clickup";

/**
 * Group tasks into parent tasks with their subtasks
 * Returns an array of objects containing a parent task and its subtasks
 */
interface TaskGroup {
  parent: ClickUpTask;
  subtasks: ClickUpTask[];
}

/** Check if a task is a subtask (has a parent) */
export function isSubtask(task: ClickUpTask): boolean {
  return task.parent !== null;
}
/** Check if a task has subtasks */
export function hasSubtasks(task: ClickUpTask, allTasks: ClickUpTask[]): boolean {
  return allTasks.some((t) => t.parent === task.id);
}
/** Get all subtasks for a given parent task */
export function getSubtasks(parentTask: ClickUpTask, allTasks: ClickUpTask[]): ClickUpTask[] {
  return allTasks.filter((t) => t.parent === parentTask.id);
}
/** Get the parent task for a subtask */
export function getParentTask(subtask: ClickUpTask, allTasks: ClickUpTask[]): ClickUpTask | undefined {
  if (!subtask.parent) return undefined;
  return allTasks.find((t) => t.id === subtask.parent);
}
/** Count subtasks for a parent task */
export function countSubtasks(parentTask: ClickUpTask, allTasks: ClickUpTask[]): number {
  return allTasks.filter((t) => t.parent === parentTask.id).length;
}
/** Sort tasks to show parent tasks before their subtasks */
export function sortTasksHierarchically(tasks: ClickUpTask[]): ClickUpTask[] {
  const sorted: ClickUpTask[] = [];
  const processed = new Set<string>();
  function addTaskAndSubtasks(task: ClickUpTask) {
    if (processed.has(task.id)) return;
    processed.add(task.id);
    sorted.push(task);
    const subtasks = tasks.filter((t) => t.parent === task.id);
    for (const subtask of subtasks) {
      addTaskAndSubtasks(subtask);
    }
  }
  const topLevelTasks = tasks.filter((t) => !t.parent);
  for (const task of topLevelTasks) {
    addTaskAndSubtasks(task);
  }
  for (const task of tasks) {
    if (!processed.has(task.id)) {
      sorted.push(task);
      processed.add(task.id);
    }
  }
  return sorted;
}

/**
 * Sort tasks by status order, then by task order within status
 */
function sortTasksByBoardOrder(tasks: ClickUpTask[]): ClickUpTask[] {
  return [...tasks].sort((a, b) => {
    const aStatusOrder = a.status.orderindex ?? 0;
    const bStatusOrder = b.status.orderindex ?? 0;

    if (aStatusOrder !== bStatusOrder) {
      return aStatusOrder - bStatusOrder;
    }

    const aTaskOrder = parseFloat(a.orderindex);
    const bTaskOrder = parseFloat(b.orderindex);
    return aTaskOrder - bTaskOrder;
  });
}

export function groupTasksWithSubtasks(tasks: ClickUpTask[]): TaskGroup[] {
  const topLevelTasks = tasks.filter((t) => !t.parent);
  const sortedParents = sortTasksByBoardOrder(topLevelTasks);

  return sortedParents.map((parent) => {
    const subtasks = getSubtasks(parent, tasks);
    const sortedSubtasks = sortTasksByBoardOrder(subtasks);

    return {
      parent,
      subtasks: sortedSubtasks,
    };
  });
}
