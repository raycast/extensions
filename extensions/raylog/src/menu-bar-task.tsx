import {
  Cache,
  LaunchType,
  MenuBarExtra,
  Toast,
  environment,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import path from "path";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildMenuBarTaskSubmenuSections } from "./lib/menu-bar-task-submenus";
import { buildMenuBarTaskActionSpecs } from "./lib/task-flow";
import {
  getTaskActionIcon,
  getTaskIndicatorIcon,
  getTaskStatusIcon,
} from "./lib/task-visuals";
import { readMenuBarCache } from "./lib/menu-bar-cache";
import { refreshMenuBarState } from "./lib/menu-bar-state";
import { createMenuBarRepository } from "./lib/menu-bar-state-runtime";
import { getRaylogErrorMessage } from "./lib/storage";
import type { TaskRecord } from "./lib/types";

export default function Command() {
  const repository = useMemo(() => createMenuBarRepository(), []);
  const cacheStore = useMemo(() => new Cache(), []);
  const cachedState = useMemo(() => readMenuBarCache(cacheStore), [cacheStore]);
  const [isLoading, setIsLoading] = useState(!repository && !cachedState);
  const [currentTask, setCurrentTask] = useState<TaskRecord | undefined>(
    cachedState?.currentTask,
  );
  const [menuTasks, setMenuTasks] = useState<TaskRecord[]>(
    cachedState?.menuTasks ?? [],
  );
  const [title, setTitle] = useState(cachedState?.title ?? "Raylog");
  const [tooltip, setTooltip] = useState(
    cachedState?.tooltip ?? "Raylog task menu bar",
  );

  const loadMenuBarTasks = useCallback(async () => {
    const nextState = await refreshMenuBarState({
      repository,
      cacheStore,
    });
    setCurrentTask(nextState.currentTask);
    setMenuTasks(nextState.menuTasks);
    setTitle(nextState.title);
    setTooltip(nextState.tooltip);
    setIsLoading(false);
  }, [cacheStore, repository]);

  useEffect(() => {
    void loadMenuBarTasks();
  }, [loadMenuBarTasks]);

  const handleTaskAction = useCallback(
    async (task: TaskRecord, action: "complete" | "start" | "archive") => {
      if (!repository) {
        return;
      }

      const actionHandlers = {
        complete: async () => repository.completeTask(task.id),
        start: async () => repository.startTask(task.id),
        archive: async () => repository.archiveTask(task.id),
      } as const;

      const successTitles = {
        complete: "Task completed",
        start: "Task started",
        archive: "Task archived",
      } as const;

      const failureTitles = {
        complete: "Unable to complete task",
        start: "Unable to start task",
        archive: "Unable to archive task",
      } as const;

      try {
        await actionHandlers[action]();
        await showToast({
          style: Toast.Style.Success,
          title: successTitles[action],
        });
        await loadMenuBarTasks();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: failureTitles[action],
          message: getRaylogErrorMessage(error, `${failureTitles[action]}.`),
        });
      }
    },
    [loadMenuBarTasks, repository],
  );

  const taskSections = useMemo(
    () => buildMenuBarTaskSubmenuSections(currentTask, menuTasks),
    [currentTask, menuTasks],
  );

  const openTask = useCallback((taskId: string) => {
    void launchCommand({
      name: "list-tasks",
      type: LaunchType.UserInitiated,
      context: { selectedTaskId: taskId },
    });
  }, []);

  const openTaskList = useCallback(() => {
    void launchCommand({
      name: "list-tasks",
      type: LaunchType.UserInitiated,
    });
  }, []);

  if (!repository && !currentTask) {
    return (
      <MenuBarExtra
        icon={{
          source: {
            light: path.join(environment.assetsPath, "menu-bar-icon-light.svg"),
            dark: path.join(environment.assetsPath, "menu-bar-icon-dark.svg"),
          },
        }}
        isLoading={isLoading}
        title={title}
        tooltip={tooltip}
      >
        <MenuBarExtra.Section title="Current Task">
          <MenuBarExtra.Item title={title} />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section title="Actions">
          <MenuBarExtra.Item
            title="Open Task List"
            icon={getTaskActionIcon("Open Task")}
            onAction={openTaskList}
          />
          <MenuBarExtra.Item
            title="Open Extension Preferences"
            icon={getTaskActionIcon("Open Extension Preferences")}
            onAction={openExtensionPreferences}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra
      icon={{
        source: {
          light: path.join(environment.assetsPath, "menu-bar-icon-light.svg"),
          dark: path.join(environment.assetsPath, "menu-bar-icon-dark.svg"),
        },
      }}
      isLoading={isLoading}
      title={title}
      tooltip={tooltip}
    >
      {taskSections.length === 0 ? (
        <MenuBarExtra.Section title="Current Task">
          <MenuBarExtra.Item title={title} />
        </MenuBarExtra.Section>
      ) : (
        taskSections.map((section) => (
          <MenuBarExtra.Section key={section.title} title={section.title}>
            {section.items.map((item) => (
              <MenuBarExtra.Submenu
                key={item.task.id}
                title={item.task.header}
                icon={getTaskStatusIcon(item.task.status)}
              >
                {item.dueLabel && item.dueTone ? (
                  <MenuBarExtra.Item
                    title={item.dueLabel}
                    icon={getTaskIndicatorIcon("due", item.dueTone)}
                  />
                ) : null}
                {buildMenuBarTaskActionSpecs(item.task).map((action) => (
                  <MenuBarExtra.Item
                    key={`${item.task.id}-${action.title}`}
                    title={action.title}
                    icon={getTaskActionIcon(action.title)}
                    onAction={() => {
                      if (action.kind === "target") {
                        openTask(item.task.id);
                        return;
                      }

                      void handleTaskAction(item.task, action.action);
                    }}
                  />
                ))}
              </MenuBarExtra.Submenu>
            ))}
          </MenuBarExtra.Section>
        ))
      )}
      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          title="Open Task List"
          icon={getTaskActionIcon("Open Task")}
          onAction={openTaskList}
        />
        <MenuBarExtra.Item
          title="Open Extension Preferences"
          icon={getTaskActionIcon("Open Extension Preferences")}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
