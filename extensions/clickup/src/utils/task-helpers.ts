import { ClickUpTask } from "../types/clickup";

/**
 * A task with its nesting depth information
 */
interface TaskWithDepth {
  depth: number;
  task: ClickUpTask;
}

/**
 * A task with depth and assignment context information
 */
export interface TaskWithDepthAndContext {
  depth: number;
  isAssignedToUser: boolean;
  task: ClickUpTask;
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

/**
 * Calculate the nesting depth of a task (0 for top-level, 1 for direct subtask, etc.)
 */
function getTaskDepth(task: ClickUpTask, allTasks: ClickUpTask[]): number {
  let depth = 0;
  let currentTask = task;
  const visited = new Set<string>();

  while (currentTask.parent) {
    if (visited.has(currentTask.id)) {
      break;
    }
    visited.add(currentTask.id);
    depth++;
    const parent = allTasks.find((t) => t.id === currentTask.parent);
    if (!parent) break;
    currentTask = parent;
  }

  return depth;
}

/**
 * Get all missing parent task IDs from a list of tasks
 */
export function getMissingParentIds(tasks: ClickUpTask[]): string[] {
  const taskIds = new Set(tasks.map((t) => t.id));
  const missingParentIds = new Set<string>();

  for (const task of tasks) {
    if (task.parent && !taskIds.has(task.parent)) {
      missingParentIds.add(task.parent);
    }
  }

  return Array.from(missingParentIds);
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

/**
 * Recursively flatten tasks with their depth information
 * Returns tasks in hierarchical order with depth metadata
 */
export function flattenTasksWithDepth(tasks: ClickUpTask[]): TaskWithDepth[] {
  const result: TaskWithDepth[] = [];
  const processed = new Set<string>();

  function addTaskAndSubtasksRecursively(task: ClickUpTask, depth: number) {
    if (processed.has(task.id)) return;
    processed.add(task.id);

    result.push({ depth, task });

    const subtasks = tasks.filter((t) => t.parent === task.id);
    const sortedSubtasks = sortTasksByBoardOrder(subtasks);

    for (const subtask of sortedSubtasks) {
      addTaskAndSubtasksRecursively(subtask, depth + 1);
    }
  }

  const topLevelTasks = tasks.filter((t) => !t.parent);
  const sortedTopLevel = sortTasksByBoardOrder(topLevelTasks);

  for (const task of sortedTopLevel) {
    addTaskAndSubtasksRecursively(task, 0);
  }

  for (const task of tasks) {
    if (!processed.has(task.id)) {
      const depth = getTaskDepth(task, tasks);
      result.push({ depth, task });
    }
  }

  return result;
}

/**
 * Flatten tasks with depth and assignment context
 * Used for "My Tasks" view to show parent tasks even if not assigned
 */
export function flattenTasksWithDepthAndContext(
  tasks: ClickUpTask[],
  assignedTaskIds: Set<string>,
): TaskWithDepthAndContext[] {
  const result: TaskWithDepthAndContext[] = [];
  const processed = new Set<string>();

  function addTaskAndSubtasksRecursively(task: ClickUpTask, depth: number) {
    if (processed.has(task.id)) return;
    processed.add(task.id);

    result.push({
      depth,
      isAssignedToUser: assignedTaskIds.has(task.id),
      task,
    });

    const subtasks = tasks.filter((t) => t.parent === task.id);
    const sortedSubtasks = sortTasksByBoardOrder(subtasks);

    for (const subtask of sortedSubtasks) {
      addTaskAndSubtasksRecursively(subtask, depth + 1);
    }
  }

  const topLevelTasks = tasks.filter((t) => !t.parent);
  const sortedTopLevel = sortTasksByBoardOrder(topLevelTasks);

  for (const task of sortedTopLevel) {
    addTaskAndSubtasksRecursively(task, 0);
  }

  for (const task of tasks) {
    if (!processed.has(task.id)) {
      const depth = getTaskDepth(task, tasks);
      result.push({
        depth,
        isAssignedToUser: assignedTaskIds.has(task.id),
        task,
      });
    }
  }

  return result;
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
