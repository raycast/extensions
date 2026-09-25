import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Icon,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Task,
  addToMyDay,
  completeTask,
  deleteTask,
  myDay,
  reopenTask,
  removeFromMyDay,
  showTask,
} from "./cli";
import { EditTask } from "./edit-task";
import { graphDate, literalMarkdown, notesMarkdown } from "./task-display";

type Preferences = { cliPath?: string };
type Props = { id: string; listName?: string; onChanged: () => void };

export function TaskDetail({ id, listName, onChanged }: Props) {
  const { cliPath } = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();
  const [task, setTask] = useState<Task>();
  const [inMyDay, setInMyDay] = useState<boolean>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const writing = useRef(false);
  const confirmingDelete = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.allSettled([showTask(id, cliPath), myDay(cliPath)])
      .then(([detail, day]) => {
        if (cancelled) return;
        if (detail.status === "rejected") {
          setTask(undefined);
          setError(
            detail.reason instanceof Error
              ? detail.reason.message
              : String(detail.reason),
          );
          return;
        }
        setTask(detail.value);
        setInMyDay(
          day.status === "fulfilled" && day.value.sync.state !== "initial"
            ? day.value.items.some((item) => item.id === id)
            : undefined,
        );
        setError(undefined);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, cliPath, revision]);

  const changed = useCallback(() => {
    onChanged();
    setTask(undefined);
    setLoading(true);
    setRevision((value) => value + 1);
  }, [onChanged]);

  async function perform(
    action: () => Promise<void>,
    title: string,
    deleted = false,
  ) {
    if (writing.current) return;
    writing.current = true;
    try {
      await action();
      await showToast({
        style: Toast.Style.Success,
        title,
        message: "Changed locally; sync may still be pending",
      });
      onChanged();
      if (deleted) pop();
      else {
        setTask(undefined);
        setLoading(true);
        setRevision((value) => value + 1);
      }
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not change task",
        message: cause instanceof Error ? cause.message : String(cause),
      });
    } finally {
      writing.current = false;
    }
  }

  async function remove() {
    if (!task || writing.current || confirmingDelete.current) return;
    confirmingDelete.current = true;
    try {
      const confirmed = await confirmAlert({
        title: "Delete task?",
        message: `“${task.title}” will be deleted locally and queued for Microsoft To Do.`,
        primaryAction: {
          title: "Delete Task",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (confirmed)
        await perform(
          () => deleteTask(task.id, cliPath),
          "Task deleted locally",
          true,
        );
    } finally {
      confirmingDelete.current = false;
    }
  }

  const metadata = task ? (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Title" text={task.title} />
      {listName && <Detail.Metadata.Label title="List" text={listName} />}
      <Detail.Metadata.Label title="Status" text={task.status} />
      <Detail.Metadata.Label
        title="Importance"
        text={task.importance ?? "normal"}
      />
      <Detail.Metadata.Label
        title="Due"
        text={graphDate(task.dueDateTime, true)}
      />
      <Detail.Metadata.Label
        title="Reminder"
        text={graphDate(task.reminderDateTime)}
      />
      <Detail.Metadata.Label
        title="My Day"
        text={inMyDay === undefined ? "Unknown" : inMyDay ? "Yes" : "No"}
      />
      <Detail.Metadata.Label title="Sync" text={task.sync_state ?? "unknown"} />
      {!!task.categories?.length && (
        <Detail.Metadata.Label
          title="Categories"
          text={task.categories.join(", ")}
        />
      )}
    </Detail.Metadata>
  ) : undefined;

  return (
    <Detail
      isLoading={loading}
      markdown={
        error
          ? `## Could not load task\n\n${literalMarkdown(error)}`
          : task
            ? `## Notes\n\n${notesMarkdown(task)}`
            : "Loading task…"
      }
      metadata={metadata}
      actions={
        <ActionPanel>
          {task && !loading && (
            <>
              {task.status === "completed" ? (
                <Action
                  title="Reopen Task"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={() =>
                    void perform(
                      () => reopenTask(task.id, cliPath),
                      "Task reopened locally",
                    )
                  }
                />
              ) : (
                <Action
                  title="Complete Task"
                  icon={Icon.CheckCircle}
                  onAction={() =>
                    void perform(
                      () => completeTask(task.id, cliPath),
                      "Task completed locally",
                    )
                  }
                />
              )}
              <Action.Push
                title="Edit Task"
                icon={Icon.Pencil}
                target={
                  <EditTask task={task} cliPath={cliPath} onSaved={changed} />
                }
              />
              {inMyDay !== undefined &&
                (inMyDay ? (
                  <Action
                    title="Remove from My Day"
                    icon={Icon.MinusCircle}
                    onAction={() =>
                      void perform(
                        () => removeFromMyDay(task.id, cliPath),
                        "Removed from My Day locally",
                      )
                    }
                  />
                ) : (
                  <Action
                    title="Add to My Day"
                    icon={Icon.PlusCircle}
                    onAction={() =>
                      void perform(
                        () => addToMyDay(task.id, cliPath),
                        "Added to My Day locally",
                      )
                    }
                  />
                ))}
              <Action
                title="Delete Task"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void remove()}
              />
            </>
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => setRevision((value) => value + 1)}
          />
        </ActionPanel>
      }
    />
  );
}
