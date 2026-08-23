import React, { useCallback } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { tasktick, CliError } from "../lib/tasktick";
import { statusIcon, statusAccessories } from "../lib/format";
import { isGuiRunning } from "../lib/gui-status";
import { useTasktickTasks } from "../hooks/use-tasktick-tasks";
import { LogsDetail } from "./logs-detail";
import type { Task } from "../lib/types";

interface Props {
  cliPath: string;
  prefs: Preferences.SearchTasks;
}

export function TasksList({ cliPath, prefs }: Props) {
  const { tasks, isLoading, refreshList, scheduleRefresh } =
    useTasktickTasks(cliPath);

  const performAction = useCallback(
    async (verb: "run" | "stop" | "restart" | "reveal", task: Task) => {
      const verbCap = verb.charAt(0).toUpperCase() + verb.slice(1);
      if (verb !== "reveal" && !(await isGuiRunning(cliPath))) {
        await showToast({
          style: Toast.Style.Failure,
          title: "TaskTick is not running",
          message: "Open TaskTick.app first, then try again",
        });
        return;
      }
      if (prefs.showCompletionToast) {
        await showToast({
          style: Toast.Style.Animated,
          title: `${verbCap}…`,
          message: task.name,
        });
      }
      try {
        await tasktick[verb](cliPath, task.id);
        if (prefs.showCompletionToast) {
          await showToast({
            style: Toast.Style.Success,
            title: verbCap,
            message: task.name,
          });
        }
        scheduleRefresh();
      } catch (err) {
        const msg = err instanceof CliError ? err.message : String(err);
        await showToast({
          style: Toast.Style.Failure,
          title: `${verb} failed`,
          message: msg,
        });
      }
    },
    [cliPath, prefs.showCompletionToast, scheduleRefresh],
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tasks…">
      {tasks.map((task) => (
        <TaskListItem
          key={task.id}
          task={task}
          cliPath={cliPath}
          logsFormat={prefs.logsFormat}
          onAction={performAction}
          onRefresh={refreshList}
        />
      ))}
    </List>
  );
}

interface TaskListItemProps {
  task: Task;
  cliPath: string;
  logsFormat: "text" | "json";
  onAction: (verb: "run" | "stop" | "restart" | "reveal", task: Task) => void;
  onRefresh: () => Promise<void>;
}

function TaskListItem({
  task,
  cliPath,
  logsFormat,
  onAction,
  onRefresh,
}: TaskListItemProps) {
  const isRunning = task.status === "running";

  return (
    <List.Item
      icon={statusIcon(task)}
      title={task.name}
      subtitle={task.scheduleSummary}
      accessories={statusAccessories(task)}
      actions={
        <ActionPanel>
          {isRunning ? (
            <>
              <Action
                title="Stop"
                icon={Icon.Stop}
                onAction={() => onAction("stop", task)}
              />
              <Action
                title="Restart"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => onAction("restart", task)}
              />
            </>
          ) : (
            <>
              <Action
                title="Run"
                icon={Icon.Play}
                onAction={() => onAction("run", task)}
              />
              <Action
                title="Stop"
                icon={Icon.Stop}
                onAction={() => onAction("stop", task)}
              />
            </>
          )}
          <Action
            title="Reveal in Tasktick"
            icon={Icon.Window}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() => onAction("reveal", task)}
          />
          <Action.Push
            title="View Last Output"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            target={
              <LogsDetail
                cliPath={cliPath}
                taskId={task.id}
                taskName={task.name}
                format={logsFormat}
              />
            }
          />
          <Action.CopyToClipboard
            title="Copy Task ID"
            content={task.id}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Refresh List"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}
