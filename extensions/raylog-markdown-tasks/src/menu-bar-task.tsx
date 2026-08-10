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
import { getDueSoonDays } from "./lib/config";
import { executeMenuBarTaskAction } from "./lib/menu-bar-task-actions";
import { buildMenuBarTaskSubmenuSections } from "./lib/menu-bar-task-submenus";
import { buildMenuBarTaskActionSpecs } from "./lib/task-flow";
import { getTaskActionIcon, getTaskIndicatorIcon, getTaskStatusIcon } from "./lib/task-visuals";
import { readMenuBarCache } from "./lib/menu-bar-cache";
import { refreshMenuBarState } from "./lib/menu-bar-state";
import { createMenuBarRepository } from "./lib/menu-bar-state-runtime";
import type { TaskRecord } from "./lib/types";

export default function Command() {
  const repository = useMemo(() => createMenuBarRepository(), []);
  const dueSoonDays = useMemo(() => getDueSoonDays(), []);
  const cacheStore = useMemo(() => new Cache(), []);
  const cachedState = useMemo(() => readMenuBarCache(cacheStore), [cacheStore]);
  const [isLoading, setIsLoading] = useState(!repository && !cachedState);
  const [currentTask, setCurrentTask] = useState<TaskRecord | undefined>(cachedState?.currentTask);
  const [menuTasks, setMenuTasks] = useState<TaskRecord[]>(cachedState?.menuTasks ?? []);
  const [title, setTitle] = useState(cachedState?.title ?? "Raylog - Markdown Tasks");
  const [tooltip, setTooltip] = useState(cachedState?.tooltip ?? "Raylog - Markdown Tasks menu bar");

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
      await executeMenuBarTaskAction({
        action,
        task,
        repository,
        loadMenuBarTasks,
        setIsLoading,
        showToast: async ({ style, title, message }) =>
          showToast({
            style: style === "success" ? Toast.Style.Success : Toast.Style.Failure,
            title,
            message,
          }),
      });
    },
    [loadMenuBarTasks, repository],
  );

  const taskSections = useMemo(
    () => buildMenuBarTaskSubmenuSections(currentTask, menuTasks, dueSoonDays),
    [currentTask, dueSoonDays, menuTasks],
  );

  const openTask = useCallback((taskId: string) => {
    return launchCommand({
      name: "list-tasks",
      type: LaunchType.UserInitiated,
      context: { selectedTaskId: taskId },
    });
  }, []);

  const openTaskList = useCallback(() => {
    return launchCommand({
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
          <MenuBarExtra.Item title="Open Task List" icon={getTaskActionIcon("Open Task")} onAction={openTaskList} />
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
                  <MenuBarExtra.Item title={item.dueLabel} icon={getTaskIndicatorIcon("due", item.dueTone)} />
                ) : null}
                {buildMenuBarTaskActionSpecs(item.task).map((action) => (
                  <MenuBarExtra.Item
                    key={`${item.task.id}-${action.title}`}
                    title={action.title}
                    icon={getTaskActionIcon(action.title)}
                    onAction={async () => {
                      if (action.kind === "target") {
                        await openTask(item.task.id);
                        return;
                      }

                      await handleTaskAction(item.task, action.action);
                    }}
                  />
                ))}
              </MenuBarExtra.Submenu>
            ))}
          </MenuBarExtra.Section>
        ))
      )}
      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item title="Open Task List" icon={getTaskActionIcon("Open Task")} onAction={openTaskList} />
        <MenuBarExtra.Item
          title="Open Extension Preferences"
          icon={getTaskActionIcon("Open Extension Preferences")}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
