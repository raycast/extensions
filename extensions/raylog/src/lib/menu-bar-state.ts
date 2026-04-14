import {
  clearMenuBarCache,
  writeMenuBarCache,
  type MenuBarCacheState,
  type MenuBarCacheStore,
} from "./menu-bar-cache";
import { getMenuBarTask, getMenuBarTasks } from "./tasks";
import { getRaylogErrorMessage } from "./storage";
import type { TaskRecord } from "./types";

export interface MenuBarRepository {
  listTasks(): Promise<TaskRecord[]>;
}

export interface MenuBarViewState extends MenuBarCacheState {}

export async function refreshMenuBarState(options: {
  repository?: MenuBarRepository;
  cacheStore: MenuBarCacheStore;
}): Promise<MenuBarViewState> {
  if (!options.repository) {
    clearMenuBarCache(options.cacheStore);
    return {
      currentTask: undefined,
      menuTasks: [],
      title: "Set Up Raylog",
      tooltip: "Configure a Raylog storage note in extension preferences.",
    };
  }

  try {
    const tasks = await options.repository.listTasks();
    const nextCurrentTask = getMenuBarTask(tasks);
    const nextMenuTasks = getMenuBarTasks(tasks, 5);
    const nextState = buildMenuBarState(nextCurrentTask, nextMenuTasks);

    writeMenuBarCache(nextState, options.cacheStore);
    return nextState;
  } catch (error) {
    clearMenuBarCache(options.cacheStore);
    return {
      currentTask: undefined,
      menuTasks: [],
      title: "Raylog Error",
      tooltip: getRaylogErrorMessage(error, "Unable to load Raylog tasks."),
    };
  }
}

export function buildMenuBarState(
  task: TaskRecord | undefined,
  menuTasks: TaskRecord[],
): MenuBarViewState {
  if (!task) {
    return {
      currentTask: undefined,
      menuTasks,
      title: "No Tasks",
      tooltip: "No non-archived Raylog tasks are available.",
    };
  }

  return {
    currentTask: task,
    menuTasks,
    title: task.header,
    tooltip: task.dueDate
      ? `Next due task: ${task.header}`
      : `First task: ${task.header}`,
  };
}
