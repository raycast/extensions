import { Action, ActionPanel, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { getProgressIcon, showFailureToast, useCachedPromise } from "@raycast/utils";
import { actionURL, repeatRule, Task, taskLinks, twoDo } from "./2do";
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
// `parent` is set for a project's or checklist's items.
export function TaskItem({
  task: t,
  parent,
  onChange: reloadList,
}: {
  task: Task;
  parent?: Task;
  onChange: () => void;
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

  // 2Do completes a project's or checklist's open items along with it, so this asks first when the
  // items, read fresh from 2Do rather than from the cached ring, include open ones.
  async function completeWithItems() {
    try {
      const { tasks } = await twoDo<{ tasks: Task[] }>("list_subtasks", { task_id: t.task_id });
      const open = tasks.filter((i) => !i.completed).length;
      const ok =
        open === 0 ||
        (await confirmAlert({
          title: `Complete "${t.title}" and ${open === 1 ? "its open item" : `its ${open} open items`}?`,
          primaryAction: { title: "Complete All" },
          dismissAction: { title: "Not Now" },
        }));
      if (!ok) return;
      await twoDo("complete_task", { task_id: t.task_id });
      await showToast({ style: Toast.Style.Success, title: "Completed" });
      onChange();
    } catch (error) {
      await showFailureToast(error, { title: "Could not complete task" });
    }
  }

  return (
    <List.Item
      title={t.title}
      subtitle={t.list_title}
      keywords={[t.notes, ...t.tags.map((tag) => tag.title), ...links, ...(t.action.value ? [t.action.value] : [])]}
      icon={
        t.completed
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
            <Action
              title="Complete Task"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={completeWithItems}
            />
          ) : (
            <Action
              title={t.completed ? "Mark as Not Done" : "Complete Task"}
              icon={t.completed ? Icon.Circle : Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() =>
                run(t.completed ? "Marked not done" : "Completed", t.completed ? "uncomplete_task" : "complete_task", {
                  task_id: t.task_id,
                })
              }
            />
          )}
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
            onAction={onChange}
          />
        </ActionPanel>
      }
    />
  );
}
