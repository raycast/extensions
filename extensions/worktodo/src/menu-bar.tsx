import { Cache, Color, Icon, LaunchType, MenuBarExtra, Toast, type LaunchProps } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { showMenuBarFeedback } from "./menu-bar-feedback";
import { launchMyTasks } from "./raycast-commands";
import {
  createOperationScopedTaskLifecycleMutations,
  IMMEDIATE_COMPLETION_POLICY,
  TaskLifecycleInteraction,
  type TaskLifecycleHistoryState,
  type TaskLifecycleMutationKind,
} from "./shared/application/task-lifecycle-interaction";
import {
  hideMenuBar as persistMenuBarHidden,
  initialMenuBarHidden,
  loadMenuBarModel,
} from "./shared/application/menu-bar-workflows";
import { openProductionWorktodo } from "./shared/application/worktodo";
import { buildMenuBarTaskHistoryItem, menuBarTaskTitle, type MenuBarModel } from "./shared/presentation/menu-bar";
import { taskLifecycleHistoryTitle, taskLifecycleMutationPresentation } from "./shared/presentation/task-lifecycle";
import type { MyTasksLaunchContext } from "./shared/presentation/task-launch";
import { taskLifecycleHistoryActionPresentation } from "./task-lifecycle-raycast";
import { MENU_ICON_TINT, menuBarTaskIcon } from "./task-priority-raycast";

const EMPTY_MODEL: MenuBarModel = { count: 0, title: undefined, sections: [] };
const menuBarVisibilityCache = new Cache({ namespace: "menu-bar-visibility" });

type MenuState = {
  isLoading: boolean;
  error: string | null;
  model: MenuBarModel;
};

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred";
}

function menuIcon(source: Icon) {
  return { source, tintColor: MENU_ICON_TINT };
}

export default function Command(props: LaunchProps) {
  const [viewerTimeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [hidden, setHidden] = useState(() =>
    initialMenuBarHidden(menuBarVisibilityCache, props.launchType === LaunchType.UserInitiated),
  );
  const [state, setState] = useState<MenuState>({ isLoading: true, error: null, model: EMPTY_MODEL });
  const [taskHistoryState, setTaskHistoryState] = useState<TaskLifecycleHistoryState | null>(null);
  const refreshRef = useRef<() => void>(() => undefined);
  const lifecycle = useRef<TaskLifecycleInteraction | null>(null);
  if (lifecycle.current === null) {
    lifecycle.current = new TaskLifecycleInteraction({
      mutations: createOperationScopedTaskLifecycleMutations(openProductionWorktodo),
      policy: IMMEDIATE_COMPLETION_POLICY,
      refresh: { refreshView: () => refreshRef.current() },
      onHistoryChanged: setTaskHistoryState,
    });
  }
  const performTaskHistoryRef = useRef<(state: TaskLifecycleHistoryState) => Promise<void>>(async () => undefined);

  const showFeedback = useCallback(
    (options: Toast.Options) => showMenuBarFeedback(props.launchType, options),
    [props.launchType],
  );

  const refresh = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      setState({
        isLoading: false,
        error: null,
        model: loadMenuBarModel(openProductionWorktodo, viewerTimeZone, Date.now()),
      });
    } catch (error) {
      setState({ isLoading: false, error: messageFrom(error), model: EMPTY_MODEL });
    }
  }, [viewerTimeZone]);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!hidden) {
      refresh();
    }
  }, [hidden, refresh]);

  useEffect(() => () => lifecycle.current?.dispose(), []);

  const showHistoryToast = useCallback(
    async (title: string, message: string, nextState: TaskLifecycleHistoryState) => {
      await showFeedback({
        style: Toast.Style.Success,
        title,
        message,
        primaryAction: {
          title: taskLifecycleHistoryTitle(nextState),
          onAction: () => void performTaskHistoryRef.current(nextState),
        },
      });
    },
    [showFeedback],
  );

  const performTaskHistory = useCallback(
    async (expected: TaskLifecycleHistoryState) => {
      const interaction = lifecycle.current;
      if (!interaction) {
        return;
      }

      const result = interaction.runHistory(expected);
      if (result.status === "unavailable") {
        await showFeedback({
          style: Toast.Style.Failure,
          title: expected.direction === "undo" ? "Undo no longer available" : "Redo no longer available",
          message: expected.taskTitle,
        });
        return;
      }
      if (result.status === "failed") {
        await showFeedback({
          style: Toast.Style.Failure,
          title: expected.direction === "undo" ? "Unable to undo task" : "Unable to redo task",
          message: messageFrom(result.error),
        });
        return;
      }
      if (result.status === "duplicate") {
        return;
      }

      const presentation = taskLifecycleMutationPresentation(result.operation);
      await showHistoryToast(presentation.successTitle, result.task.title, result.history);
    },
    [showFeedback, showHistoryToast],
  );
  performTaskHistoryRef.current = performTaskHistory;

  const performLifecycleMutation = useCallback(
    async (operation: TaskLifecycleMutationKind, taskId: string) => {
      const interaction = lifecycle.current;
      if (!interaction) {
        return;
      }

      const presentation = taskLifecycleMutationPresentation(operation);
      const result = interaction.runMutation(operation, taskId);
      if (result.status === "failed") {
        await showFeedback({
          style: Toast.Style.Failure,
          title: presentation.failureTitle,
          message: messageFrom(result.error),
        });
        return;
      }
      if (result.status === "duplicate") {
        return;
      }

      if (result.history) {
        await showHistoryToast(presentation.successTitle, result.task.title, result.history);
      }
    },
    [showFeedback, showHistoryToast],
  );

  const hideMenuBar = useCallback(async () => {
    try {
      persistMenuBarHidden(menuBarVisibilityCache);
    } catch (error) {
      await showFeedback({
        style: Toast.Style.Failure,
        title: "Unable to hide Worktodo",
        message: messageFrom(error),
      });
      return;
    }

    lifecycle.current?.clearHistory();
    await showFeedback({
      style: Toast.Style.Success,
      title: "Worktodo hidden from the menu bar",
      message: "Run Worktodo menu bar to show it again.",
    });
    setHidden(true);
  }, [showFeedback]);

  async function openMyTasks(context: MyTasksLaunchContext) {
    try {
      await launchMyTasks(context);
    } catch (error) {
      await showFeedback({
        style: Toast.Style.Failure,
        title: "Unable to open tasks",
        message: messageFrom(error),
      });
    }
  }

  if (hidden) {
    return null;
  }

  const tooltip =
    state.model.count === 0
      ? "Worktodo — nothing due today"
      : `Worktodo — ${state.model.count} ${state.model.count === 1 ? "task" : "tasks"} due`;
  const historyItem = taskHistoryState ? buildMenuBarTaskHistoryItem(taskHistoryState) : null;
  const historyAction = taskHistoryState ? taskLifecycleHistoryActionPresentation(taskHistoryState) : null;

  return (
    <MenuBarExtra
      icon={{ source: "worktodo-menu-bar-template.png", tintColor: Color.PrimaryText }}
      title={state.model.title}
      tooltip={tooltip}
      isLoading={state.isLoading}
    >
      {state.error ? (
        <MenuBarExtra.Section title="Worktodo">
          <MenuBarExtra.Item title="Unable to load tasks" subtitle={state.error} icon={menuIcon(Icon.Warning)} />
        </MenuBarExtra.Section>
      ) : state.model.sections.length === 0 ? (
        <MenuBarExtra.Section title="This week">
          <MenuBarExtra.Item title="Nothing due this week" icon={menuIcon(Icon.CheckCircle)} />
        </MenuBarExtra.Section>
      ) : (
        state.model.sections.map((section) => (
          <MenuBarExtra.Section key={section.key} title={section.title}>
            {section.tasks.map((task) => (
              <MenuBarExtra.Submenu key={task.id} title={menuBarTaskTitle(task)} icon={menuBarTaskIcon()}>
                <MenuBarExtra.Section title={task.projectName ?? undefined}>
                  <MenuBarExtra.Item
                    title="Complete"
                    icon={menuIcon(Icon.CheckCircle)}
                    onAction={() => performLifecycleMutation("complete", task.id)}
                  />
                  <MenuBarExtra.Item
                    title="Open"
                    icon={menuIcon(Icon.AppWindowList)}
                    onAction={() => openMyTasks({ view: task.view, selectedTaskId: task.id })}
                  />
                  <MenuBarExtra.Item
                    title="Edit"
                    icon={menuIcon(Icon.Pencil)}
                    onAction={() => openMyTasks({ view: task.view, selectedTaskId: task.id, editTask: true })}
                  />
                  <MenuBarExtra.Item
                    title="Move to Trash"
                    icon={menuIcon(Icon.Trash)}
                    onAction={() => performLifecycleMutation("trash", task.id)}
                  />
                </MenuBarExtra.Section>
              </MenuBarExtra.Submenu>
            ))}
          </MenuBarExtra.Section>
        ))
      )}

      {historyItem && historyAction && taskHistoryState ? (
        <MenuBarExtra.Section title="Recent action">
          <MenuBarExtra.Item
            title={historyItem.title}
            subtitle={historyItem.subtitle}
            icon={menuIcon(historyAction.icon)}
            shortcut={historyAction.shortcut}
            onAction={() => performTaskHistory(taskHistoryState)}
          />
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="New Task"
          icon={menuIcon(Icon.Plus)}
          onAction={() => openMyTasks({ view: "all", createTask: true })}
        />
        <MenuBarExtra.Item
          title="All Tasks"
          icon={menuIcon(Icon.AppWindowList)}
          onAction={() => openMyTasks({ view: "all" })}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Hide from Menu Bar" icon={menuIcon(Icon.EyeDisabled)} onAction={hideMenuBar} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
