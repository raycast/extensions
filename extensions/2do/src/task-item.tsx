import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { getProgressIcon, showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import {
  actionURL,
  applyCancelMark,
  CancelPrefs,
  cancelTask,
  clearCancelMark,
  completeParent,
  inCancelList,
  isCancelled,
  isRepeating,
  List as TwoDoList,
  reopenTask,
  repeatRule,
  Task,
  taskLinks,
  twoDo,
} from "./2do";
import { ItemsView } from "./items-view";
import { TaskForm } from "./task-form";

const PRIORITY_TAGS = {
  high: { value: "High", color: Color.Red },
  medium: { value: "Medium", color: Color.Orange },
  low: { value: "Low", color: Color.Blue },
};

const PARENT_ICONS = { project: Icon.Folder, checklist: Icon.CheckList };

// 2Do stores "HH:mm"; show 12-hour times on the row (e.g. "5:00 PM").
function formatTime(time?: string) {
  if (!time) return;
  const [h, m] = time.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return time;
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

// Start uses a clock, due a flag, so the two dates stay distinct when both say e.g. "Today".
function dateAccessories(task: Task) {
  const label = (formatted: string, time?: string) => {
    const shown = formatTime(time);
    return shown ? `${formatted} ${shown}` : formatted;
  };
  return [
    ...(task.presentation.start_date_formatted
      ? [
          {
            icon: Icon.Clock,
            text: label(task.presentation.start_date_formatted, task.start_time),
            tooltip: `Start: ${label(task.presentation.start_date_formatted, task.start_time)}`,
          },
        ]
      : []),
    ...(task.presentation.due_date_formatted
      ? [
          {
            icon: Icon.Flag,
            text: {
              value: label(task.presentation.due_date_formatted, task.due_time),
              color: task.presentation.is_overdue ? Color.Red : undefined,
            },
            tooltip: `Due: ${label(task.presentation.due_date_formatted, task.due_time)}`,
          },
        ]
      : []),
  ];
}

// The ⌘L action for each 2Do action type.
const RUN_ACTION: Record<string, { title: string; icon: Icon }> = {
  url: { title: "Open Link", icon: Icon.Link },
  call: { title: "Call", icon: Icon.Phone },
  message: { title: "Send Message", icon: Icon.Message },
  mail: { title: "Send Email", icon: Icon.Envelope },
  visit: { title: "Open in Maps", icon: Icon.Map },
  google: { title: "Search Google", icon: Icon.MagnifyingGlass },
};

// A task row with its actions. `onChange` reloads the list after an action changes the task.
// `parent` is set for a project's or checklist's items. `onRefresh` / `refreshEpoch` reload every
// visible parent's child counts together (⌘R), not only this row's ring.
export function TaskItem({
  task: t,
  parent,
  onChange: reloadList,
  onRefresh,
  refreshEpoch = 0,
}: {
  task: Task;
  parent?: Task;
  onChange: () => void;
  onRefresh?: () => void;
  refreshEpoch?: number;
}) {
  const isParent = t.task_type !== "normal";
  const items = useCachedPromise(
    (id: string) => twoDo<{ tasks: Task[] }>("list_subtasks", { task_id: id }).then((r) => r.tasks),
    [t.task_id],
    { execute: isParent && !t.completed },
  );
  const itemsDone = items.data?.filter((i) => i.completed).length ?? 0;
  const onChange = () => {
    reloadList();
    if (isParent) items.revalidate();
  };
  const seenEpoch = useRef(refreshEpoch);
  const revalidateItems = items.revalidate;
  useEffect(() => {
    if (seenEpoch.current === refreshEpoch) return;
    seenEpoch.current = refreshEpoch;
    if (isParent && !t.completed) void revalidateItems();
  }, [refreshEpoch, isParent, t.completed, revalidateItems]);
  const prefs = getPreferenceValues<CancelPrefs>();
  const links = taskLinks(t);
  const actionTarget = actionURL(t.action);
  const primary = actionTarget
    ? { ...RUN_ACTION[t.action.type], target: actionTarget, value: t.action.value }
    : links[0] && { ...RUN_ACTION.url, target: links[0], value: links[0] };
  const repeat = repeatRule(t);

  async function run(title: string, command: string, args: object) {
    try {
      await twoDo(command, args);
      await showToast({ style: Toast.Style.Success, title });
      onChange();
    } catch (error) {
      await showFailureToast(error, { title: "2Do command failed" });
    }
  }

  async function reopen() {
    try {
      await reopenTask(t, prefs);
      await showToast({ style: Toast.Style.Success, title: "Marked not done" });
      onChange();
    } catch (error) {
      await showFailureToast(error, { title: "Could not mark as not done" });
    }
  }

  async function markCompleteInstead() {
    try {
      await clearCancelMark(t, prefs);
      await showToast({ style: Toast.Style.Success, title: "Marked complete" });
      onChange();
    } catch (error) {
      await showFailureToast(error, { title: "Could not mark as complete" });
    }
  }

  async function markCancelledInstead() {
    try {
      await applyCancelMark(t, prefs);
      await showToast({ style: Toast.Style.Success, title: "Marked cancelled" });
      onChange();
    } catch (error) {
      await showFailureToast(error, { title: "Could not mark as cancelled" });
    }
  }

  // 2Do completes a project's or checklist's open items along with it, so this asks first when the
  // items, read fresh from 2Do rather than from the cached ring, include open ones. Cancel Remaining
  // Items cancels each open item per Cancel Task preferences, then completes the parent.
  async function completeWithItems(cancelItems: boolean) {
    try {
      const { tasks } = await twoDo<{ tasks: Task[] }>("list_subtasks", { task_id: t.task_id });
      const open = tasks.filter((i) => !i.completed).length;
      const what = open === 1 ? "its open item" : `its ${open} open items`;
      const ok =
        open === 0 ||
        (await confirmAlert({
          title: cancelItems ? `Complete "${t.title}" and cancel ${what}?` : `Complete "${t.title}" and ${what}?`,
          message: cancelItems ? "Each item is cancelled the way Cancel Task is set up." : undefined,
          primaryAction: { title: cancelItems ? "Cancel Items and Complete" : "Complete All" },
          dismissAction: { title: "Not Now" },
        }));
      if (!ok) return;
      await completeParent(t, cancelItems, prefs);
      await showToast({ style: Toast.Style.Success, title: "Completed" });
      onChange();
    } catch (error) {
      await showFailureToast(error, { title: "Could not complete task" });
    }
  }

  async function cancel() {
    const deletes = prefs.cancelBehavior === "delete";
    try {
      if (deletes) {
        const ok = await confirmAlert({
          title: isRepeating(t) ? `Delete this occurrence of "${t.title}"?` : `Delete "${t.title}"?`,
          message: isRepeating(t)
            ? "Cancel Task is set to delete tasks. This occurrence is deleted and the next one stays. This can't be undone from Raycast."
            : "Cancel Task is set to delete tasks. This can't be undone from Raycast.",
          primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
        });
        if (!ok) return;
      } else if (prefs.cancelBehavior !== "tag" && t.task_type !== "normal") {
        const { tasks: subtasks } = await twoDo<{ tasks: Task[] }>("list_subtasks", { task_id: t.task_id });
        const open = subtasks.filter((s) => !s.completed).length;
        const ok =
          open === 0 ||
          (await confirmAlert({
            title: `Cancel "${t.title}"?`,
            message: `Its ${open === 1 ? "open subtask" : `${open} open subtasks`} will be completed too.`,
            primaryAction: { title: "Cancel Task" },
            dismissAction: { title: "Keep Task" },
          }));
        if (!ok) return;
      }
      await cancelTask(t, prefs);
      await showToast({ style: Toast.Style.Success, title: deletes ? "Deleted" : "Cancelled" });
      onChange();
    } catch (error) {
      await showFailureToast(error, { title: "Could not cancel task" });
    }
  }

  return (
    <List.Item
      title={t.title}
      subtitle={t.list_title}
      keywords={[t.notes, ...t.tags.map((tag) => tag.title), ...links, ...(t.action.value ? [t.action.value] : [])]}
      icon={
        isCancelled(t, prefs)
          ? { source: Icon.XMarkCircle, tintColor: Color.SecondaryText }
          : t.completed
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : t.task_type !== "normal"
              ? { source: PARENT_ICONS[t.task_type], tooltip: t.task_type === "project" ? "Project" : "Checklist" }
              : Icon.Circle
      }
      accessories={[
        ...(isParent && !t.completed && items.data?.length
          ? [
              {
                icon: getProgressIcon(itemsDone / items.data.length, Color.Green),
                text: `${itemsDone}/${items.data.length}`,
                tooltip: `${itemsDone} of ${items.data.length} items done`,
              },
            ]
          : []),
        ...(t.priority !== "none" ? [{ tag: PRIORITY_TAGS[t.priority] }] : []),
        ...dateAccessories(t),
        ...(primary ? [{ icon: primary.icon, tooltip: `${primary.title}: ${primary.value}` }] : []),
        ...(repeat ? [{ icon: Icon.Repeat, tooltip: `Repeats: ${repeat}` }] : []),
        ...(t.starred ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Task"
            icon={Icon.Pencil}
            target={<TaskForm task={t} parent={parent} onSaved={onChange} />}
          />
          {isParent && !t.completed ? (
            <ActionPanel.Submenu
              title="Complete Task"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            >
              <Action title="Complete Task and Its Items" onAction={() => completeWithItems(false)} />
              <Action title="Complete Task and Cancel Remaining Items" onAction={() => completeWithItems(true)} />
            </ActionPanel.Submenu>
          ) : inCancelList(t, prefs) ? (
            <Action.Push
              title="Mark as Not Done"
              icon={Icon.Circle}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={<RelocateCancelledForm task={t} onDone={onChange} />}
            />
          ) : t.completed ? (
            <Action
              title="Mark as Not Done"
              icon={Icon.Circle}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={reopen}
            />
          ) : (
            <Action
              title="Complete Task"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => run("Completed", "complete_task", { task_id: t.task_id })}
            />
          )}
          {!t.completed && (
            <Action
              title="Cancel Task"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={cancel}
            />
          )}
          {t.completed &&
            (isCancelled(t, prefs) ? (
              inCancelList(t, prefs) ? (
                <Action.Push
                  title="Mark as Complete Instead"
                  icon={Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  target={<RelocateCancelledForm task={t} onDone={onChange} stayCompleted />}
                />
              ) : (
                <Action
                  title="Mark as Complete Instead"
                  icon={Icon.CheckCircle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={markCompleteInstead}
                />
              )
            ) : prefs.cancelBehavior !== "delete" ? (
              <Action
                title="Mark as Cancelled Instead"
                icon={Icon.XMarkCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={markCancelledInstead}
              />
            ) : null)}
          {primary && (
            <Action.Open
              title={primary.title}
              icon={primary.icon}
              target={primary.target}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          )}
          {links.length > 1 && (
            <ActionPanel.Submenu
              title="Choose Link"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            >
              {links.map((url) => (
                <Action.OpenInBrowser key={url} title={url} url={url} />
              ))}
            </ActionPanel.Submenu>
          )}
          {/* Below Edit Task and Complete Task, as released, where Raycast shows custom shortcuts. */}
          {isParent && !t.completed && (
            <Action.Push
              title="Add Item"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              target={<TaskForm addTo={t} onSaved={onChange} />}
            />
          )}
          {isParent && (
            <Action.Push
              title="Show Items"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              target={<ItemsView parent={t} onChange={onChange} />}
            />
          )}
          <Action
            title={t.starred ? "Unstar" : "Star"}
            icon={Icon.Star}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() =>
              run(t.starred ? "Unstarred" : "Starred", "update_task", { task_id: t.task_id, starred: !t.starred })
            }
          />
          <Action
            title="Open in 2Do"
            icon={Icon.AppWindow}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => twoDo("open_task", { task_id: t.task_id }).catch((e) => showFailureToast(e))}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh ?? onChange}
          />
        </ActionPanel>
      }
    />
  );
}

// For a task cancelled into the Cancel List: 2Do doesn't record where it came from, so this asks
// which list it goes back to. With `stayCompleted`, it only clears the cancel mark (Mark as Complete
// Instead); otherwise it also marks the task not done.
function RelocateCancelledForm({
  task,
  onDone,
  stayCompleted = false,
}: {
  task: Task;
  onDone: () => void;
  stayCompleted?: boolean;
}) {
  const { pop } = useNavigation();
  const prefs = getPreferenceValues<CancelPrefs>();
  const lists = useCachedPromise(() => twoDo<{ list: TwoDoList[] }>("list_lists").then((r) => r.list));
  const title = stayCompleted ? "Mark as Complete Instead" : "Mark as Not Done";

  async function submit({ list_id }: { list_id: string }) {
    try {
      if (stayCompleted) await clearCancelMark(task, prefs, list_id);
      else await reopenTask(task, prefs, list_id);
      await showToast({ style: Toast.Style.Success, title: stayCompleted ? "Marked complete" : "Marked not done" });
      onDone();
      pop();
    } catch (error) {
      await showFailureToast(error, {
        title: stayCompleted ? "Could not mark as complete" : "Could not mark as not done",
      });
    }
  }

  return (
    <Form
      navigationTitle={title}
      isLoading={lists.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={title} icon={stayCompleted ? Icon.CheckCircle : Icon.Circle} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`"${task.title}" was cancelled into ${task.list_title}. Choose the list it goes back to.`}
      />
      <Form.Dropdown id="list_id" title="List">
        {lists.data
          ?.filter((l) => l.list_id !== task.list_id)
          .map((l) => (
            <Form.Dropdown.Item key={l.list_id} value={l.list_id} title={l.title} />
          ))}
      </Form.Dropdown>
    </Form>
  );
}
