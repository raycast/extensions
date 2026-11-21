import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef, useState } from "react";
import { Note, noteAppUrl, nowSeconds, shorten, Tag, Task } from "../lib/api";
import { describeRepeat } from "../lib/repeat";
import { cmd } from "../lib/shortcuts";
import { amplenote } from "../lib/amplenote";
import { tagColor } from "../lib/tags";
import { formatTimestamp, isOpen, taskReferenceCount, taskTitle } from "../lib/tasks";
import AddTaskForm from "./AddTaskForm";
import { TaskChange } from "../lib/useTaskChanges";

const MAX_NOTE_NAME = 20;

/** Dates picked without a time are scheduled at 9:00, like in the task form and the AI tools. */
function atNine(date: Date): number {
  const scheduled = new Date(date);
  scheduled.setHours(9, 0, 0, 0);
  return Math.floor(scheduled.getTime() / 1000);
}

export default function TaskListItem(props: {
  task: Task;
  note?: Note;
  tags?: Tag[];
  isHighlighted: (tag: string) => boolean;
  onChange: (task: Task, change: TaskChange, updates?: Partial<Task>) => void;
  onRefresh: () => void;
  extraActions?: React.ReactNode;
  addTaskNote?: Note;
}) {
  const { task, note } = props;
  const title = taskTitle(task.content);
  const now = nowSeconds();
  const highlightedTags = (note?.tags ?? []).filter(props.isHighlighted);
  const references = taskReferenceCount(task.content);
  const done = !isOpen(task);
  // One change per task at a time. While it saves, the row shows that and offers no other changes, so a second
  // action can't be silently dropped or race the first. The ref catches key presses before the next render.
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const run = async (
    change: TaskChange,
    pending: string,
    success: string,
    action: () => Promise<unknown>,
    updates?: Partial<Task>,
  ) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: pending });
    try {
      await action();
      toast.style = Toast.Style.Success;
      toast.title = success;
      props.onChange(task, change, updates);
      // A reopened task may no longer be in the loaded list (e.g. after a refresh), so reload to bring it back.
      if (change === "reopened") props.onRefresh();
      if (change === "completed" || change === "dismissed") {
        toast.primaryAction = {
          title: "Undo",
          onAction: () =>
            void run("reopened", "Reopening task…", "Task reopened", () => amplenote.reopenTask(task.uuid)),
        };
      }
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: `Could not update "${title}"` });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <List.Item
      id={task.uuid}
      title={title}
      icon={
        task.completedAt
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : task.dismissedAt
            ? { source: Icon.XMarkCircle, tintColor: Color.SecondaryText }
            : { source: Icon.Circle, tintColor: task.important ? Color.Red : Color.SecondaryText }
      }
      keywords={[...(note?.tags ?? []), note?.name ?? ""]}
      accessories={[
        ...(saving ? [{ icon: Icon.Clock, tooltip: "Saving…" }] : []),
        ...(note?.name ? [{ icon: Icon.Document, text: shorten(note.name, MAX_NOTE_NAME), tooltip: note.name }] : []),
        ...highlightedTags.map((tag) => ({ tag: { value: tag, color: tagColor(tag, props.tags) } })),
        ...(task.important
          ? [{ icon: { source: Icon.Exclamationmark, tintColor: Color.Red }, tooltip: "Important" }]
          : []),
        ...(task.urgent ? [{ icon: { source: Icon.Alarm, tintColor: Color.Orange }, tooltip: "Urgent" }] : []),
        ...(task.isRepeating
          ? [{ icon: Icon.Repeat, tooltip: task.repeat ? describeRepeat(task.repeat) : "Repeating" }]
          : []),
        ...(references > 0
          ? [
              {
                icon: Icon.Link,
                tooltip: references === 1 ? "Links to another task" : `Links to ${references} other tasks`,
              },
            ]
          : []),
        ...(task.deadline
          ? [
              {
                icon: { source: Icon.Flag, tintColor: task.deadline < now ? Color.Red : Color.SecondaryText },
                text: formatTimestamp(task.deadline),
                tooltip: "Deadline",
              },
            ]
          : []),
        ...(task.startAt ? [{ icon: Icon.Calendar, text: formatTimestamp(task.startAt), tooltip: "Scheduled" }] : []),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {saving ? (
              <Action
                title="Saving…"
                icon={Icon.Clock}
                onAction={() => void showToast({ style: Toast.Style.Animated, title: "Still saving this task…" })}
              />
            ) : done ? (
              <Action
                title={task.completedAt ? "Reopen Task" : "Restore Task"}
                icon={Icon.ArrowCounterClockwise}
                onAction={() =>
                  run("reopened", "Reopening task…", "Task reopened", () => amplenote.reopenTask(task.uuid))
                }
              />
            ) : (
              <Action
                title="Complete Task"
                icon={Icon.CheckCircle}
                onAction={() =>
                  run("completed", "Completing task…", "Task completed", () => amplenote.completeTask(task.uuid))
                }
              />
            )}
            <Action.Open
              title="Open Note in Amplenote"
              icon={Icon.AppWindow}
              target={noteAppUrl(task.noteUUID)}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {!done && !saving ? (
              <>
                <Action
                  title={task.important ? "Unmark Important" : "Mark Important"}
                  icon={Icon.Exclamationmark}
                  shortcut={cmd("i")}
                  onAction={() =>
                    run(
                      "updated",
                      "Updating task…",
                      task.important ? "Unmarked important" : "Marked important",
                      () => amplenote.updateTask(task.uuid, { important: !task.important }),
                      { important: !task.important },
                    )
                  }
                />
                <Action
                  title={task.urgent ? "Unmark Urgent" : "Mark Urgent"}
                  icon={Icon.Alarm}
                  shortcut={cmd("u")}
                  onAction={() =>
                    run(
                      "updated",
                      "Updating task…",
                      task.urgent ? "Unmarked urgent" : "Marked urgent",
                      () => amplenote.updateTask(task.uuid, { urgent: !task.urgent }),
                      { urgent: !task.urgent },
                    )
                  }
                />
                <Action.PickDate
                  title="Set Start Date…"
                  icon={Icon.Calendar}
                  type={Action.PickDate.Type.Date}
                  shortcut={cmd("t")}
                  onChange={(date) => {
                    const startAt = date ? atNine(date) : null;
                    void run(
                      "updated",
                      "Updating task…",
                      startAt ? `Starts ${formatTimestamp(startAt)}` : "Start date removed",
                      () => amplenote.updateTask(task.uuid, { startAt }),
                      { startAt },
                    );
                  }}
                />
                <Action.PickDate
                  title="Set Deadline…"
                  icon={Icon.Flag}
                  type={Action.PickDate.Type.Date}
                  shortcut={cmd("d")}
                  onChange={(date) => {
                    const deadline = date ? atNine(date) : null;
                    void run(
                      "updated",
                      "Updating task…",
                      deadline ? `Due ${formatTimestamp(deadline)}` : "Deadline removed",
                      () => amplenote.updateTask(task.uuid, { deadline }),
                      { deadline },
                    );
                  }}
                />
                <Action
                  title="Dismiss Task"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={() =>
                    run("dismissed", "Dismissing task…", "Task dismissed", () => amplenote.dismissTask(task.uuid))
                  }
                />
              </>
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Add Task"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              target={<AddTaskForm note={props.addTaskNote} onCreated={props.onRefresh} />}
            />
            <Action.CopyToClipboard
              title="Copy Task"
              content={task.content ?? title}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {props.extraActions}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={props.onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
