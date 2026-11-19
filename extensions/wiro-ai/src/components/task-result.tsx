import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { taskResults } from "../lib/outputs";
import { credentials } from "../lib/preferences";
import {
  failureReason,
  formatCost,
  formatSeconds,
  getTask,
  isFinished,
  isSuccessful,
  modelPageUrl,
  pollInterval,
  SITE_URL,
  statusLabel,
  stopTask,
  WiroError,
  type Task,
} from "../lib/wiro";
import { OutputListItem } from "./output-item";

export const TASK_HISTORY_URL = `${SITE_URL}/panel/task-history`;
const MAX_POLL_FAILURES = 5;

interface TaskResultProps {
  slug: string;
  taskId: string;
  taskToken: string;
  /** What the task makes, for messages: "image". */
  noun: string;
  prompt?: string;
  /** A task read earlier, such as a row of Task History. A finished one is not polled. */
  initialTask?: Task;
}

function quote(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function isPermanent(error: unknown): boolean {
  // 408 and 429 pass with time, so they do not stop the polling.
  return (
    error instanceof WiroError &&
    error.status !== undefined &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
}

/** Follows a task until it ends, then lists what it produced. */
export function TaskResult({ slug, taskId, taskToken, noun, prompt, initialTask }: TaskResultProps) {
  const [task, setTask] = useState<Task | undefined>(initialTask);
  const [pollError, setPollError] = useState<Error>();
  const [elapsedMs, setElapsedMs] = useState(0);
  const toastRef = useRef<Toast | undefined>(undefined);
  const alreadyDone = initialTask !== undefined && isFinished(initialTask);

  useEffect(() => {
    if (alreadyDone) return;
    const controller = new AbortController();
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const ticker = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);

    const finish = (current: Task | undefined, error?: Error) => {
      clearInterval(ticker);
      const toast = toastRef.current;
      if (!toast) return;
      if (current && isSuccessful(current)) {
        toast.style = Toast.Style.Success;
        toast.title = `The ${noun} is ready`;
        toast.message = formatCost(current.totalcost);
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = current?.status === "task_cancel" ? "Task cancelled" : `Could not make the ${noun}`;
        toast.message = error?.message ?? (current ? failureReason(current) : undefined);
      }
    };

    const poll = async () => {
      try {
        const current = await getTask(taskToken, credentials(), controller.signal);
        if (controller.signal.aborted) return;
        failures = 0;
        setTask(current);
        if (isFinished(current)) {
          finish(current);
          return;
        }
        if (toastRef.current) toastRef.current.message = statusLabel(current.status);
      } catch (error) {
        if (controller.signal.aborted) return;
        failures += 1;
        if (isPermanent(error) || failures >= MAX_POLL_FAILURES) {
          const reason = error instanceof Error ? error : new Error(String(error));
          setPollError(reason);
          finish(undefined, reason);
          return;
        }
      }
      timer = setTimeout(poll, pollInterval(Date.now() - startedAt));
    };

    // The first poll waits for the toast, so the toast always gets the final status.
    showToast({ style: Toast.Style.Animated, title: `Making the ${noun}` }).then((toast) => {
      if (controller.signal.aborted) {
        toast.hide();
        return;
      }
      toastRef.current = toast;
      poll();
    });

    return () => {
      controller.abort();
      clearTimeout(timer);
      clearInterval(ticker);
      if (toastRef.current?.style === Toast.Style.Animated) toastRef.current.hide();
    };
  }, [taskToken, alreadyDone]);

  const finished = task !== undefined && isFinished(task);
  const succeeded = task !== undefined && isSuccessful(task);
  const items = succeeded ? taskResults(task) : [];
  const cost = task ? formatCost(task.chargedcost ?? task.totalcost) : undefined;
  const duration = task ? formatSeconds(task.elapsedseconds) : undefined;

  const metadataRows = (
    <>
      <List.Item.Detail.Metadata.Link title="Model" text={slug} target={modelPageUrl(slug)} />
      <List.Item.Detail.Metadata.Label
        title="Status"
        text={pollError ? "Unknown" : task ? statusLabel(task.status) : "Starting"}
      />
      {duration && <List.Item.Detail.Metadata.Label title="Run Time" text={duration} />}
      {cost && <List.Item.Detail.Metadata.Label title="Cost" text={cost} />}
      {taskId && <List.Item.Detail.Metadata.Label title="Task ID" text={taskId} />}
    </>
  );
  const metadata = <List.Item.Detail.Metadata>{metadataRows}</List.Item.Detail.Metadata>;

  async function cancel() {
    if (!task) return;
    const confirmed = await confirmAlert({
      title: "Cancel this task?",
      message: "The task is cancelled and its result is not shown here.",
      primaryAction: { title: "Cancel Task", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Keep Running" },
    });
    if (!confirmed) return;
    try {
      await stopTask(task, credentials());
      await showToast({ style: Toast.Style.Success, title: "Cancelling task" });
    } catch (error) {
      await showFailureToast(error, { title: "Could not cancel the task" });
    }
  }

  const commonActions = (
    <>
      <Action.OpenInBrowser title="Open Task History" icon={Icon.List} url={TASK_HISTORY_URL} />
      <Action.OpenInBrowser title="Open Model Page" icon={Icon.Globe} url={modelPageUrl(slug)} />
    </>
  );

  let statusItem: { title: string; subtitle?: string; markdown: string; icon: Icon } | undefined;
  if (pollError) {
    statusItem = {
      title: "Could not follow the task",
      icon: Icon.Warning,
      markdown: `## Could not follow the task\n\n${pollError.message}\n\nThe task may still finish. Its result shows up in your task history on wiro.ai.`,
    };
  } else if (!finished) {
    const seconds = Math.floor(elapsedMs / 1000);
    statusItem = {
      title: task ? statusLabel(task.status) : "Starting",
      subtitle: `${seconds} s`,
      icon: Icon.CircleProgress,
      markdown: [
        `## Making the ${noun} with \`${slug}\``,
        prompt ? quote(prompt) : "",
        "Closing this view does not stop the task. Its result also shows up in your task history on wiro.ai.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  } else if (!succeeded) {
    statusItem = {
      title: task.status === "task_cancel" ? "Task cancelled" : `The ${noun} was not made`,
      icon: Icon.XMarkCircle,
      markdown:
        task.status === "task_cancel"
          ? `## The task was cancelled\n\nNo ${noun} is shown for it.`
          : `## The ${noun} was not made\n\n${failureReason(task)}\n\nFailed tasks are not charged.`,
    };
  } else if (items.length === 0) {
    statusItem = {
      title: "No output",
      icon: Icon.QuestionMarkCircle,
      markdown:
        "## The task finished without an output\n\nOpen your task history on wiro.ai to see what the model returned.",
    };
  }

  return (
    <List isLoading={!finished && !pollError} isShowingDetail navigationTitle={slug}>
      {statusItem && (
        <List.Item
          icon={statusItem.icon}
          title={statusItem.title}
          subtitle={statusItem.subtitle}
          detail={<List.Item.Detail markdown={statusItem.markdown} metadata={metadata} />}
          actions={
            <ActionPanel>
              {commonActions}
              {task && !finished && !pollError && (
                <Action
                  title="Cancel Task"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={cancel}
                />
              )}
            </ActionPanel>
          }
        />
      )}
      {items.map((item) => (
        <OutputListItem
          key={item.id}
          item={item}
          group={`task-${taskId || taskToken}`}
          metadata={metadataRows}
          extraActions={commonActions}
        />
      ))}
    </List>
  );
}
