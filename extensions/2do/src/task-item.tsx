import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  environment,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { actionURL, repeatRule, Task, taskLinks, twoDo } from "./2do";
import { ItemsView } from "./items-view";
import { TaskForm } from "./task-form";

// A progress ring like getProgressIcon's, for a project's or checklist's items.
function ringIcon(done: number, total: number) {
  const share = Math.max(0, Math.min(1, done / total));
  const r = 40;
  const c = 2 * Math.PI * r;
  const arc =
    share > 0
      ? `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${Color.Green}" stroke-width="10" stroke-dasharray="${share * c} ${c}" transform="rotate(-90 50 50)" />`
      : "";
  const track = environment.appearance === "light" ? "black" : "white";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100px" height="100px"><circle cx="50" cy="50" r="${r}" fill="none" stroke="${track}" stroke-width="10" opacity="0.1" />${arc}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PRIORITY_TAGS = {
  high: { value: "High", color: Color.Red },
  medium: { value: "Medium", color: Color.Orange },
  low: { value: "Low", color: Color.Blue },
};

const PARENT_ICONS = { project: Icon.Folder, checklist: Icon.CheckList };

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
// `parentId` is set for a project's or checklist's items.
export function TaskItem({
  task: t,
  parentId,
  onChange: reloadList,
}: {
  task: Task;
  parentId?: string;
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

  // 2Do completes a project's or checklist's open items along with it, so this asks first.
  async function completeWithItems() {
    try {
      const { tasks } = await twoDo<{ tasks: Task[] }>("list_subtasks", { task_id: t.task_id });
      const open = tasks.filter((i) => !i.completed).length;
      const ok = await confirmAlert({
        title: `Complete "${t.title}" and ${open === 1 ? "its open item" : `its ${open} open items`}?`,
        primaryAction: { title: "Complete All" },
        dismissAction: { title: "Not Now" },
      });
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
          : isParent
            ? { source: PARENT_ICONS[t.task_type], tooltip: t.task_type === "project" ? "Project" : "Checklist" }
            : Icon.Circle
      }
      accessories={[
        ...(isParent && !t.completed && items.data?.length
          ? [
              {
                icon: ringIcon(itemsDone, items.data.length),
                text: `${itemsDone}/${items.data.length}`,
                tooltip: `${itemsDone} of ${items.data.length} items done`,
              },
            ]
          : []),
        ...t.tags.map((tag) => ({ tag: tag.title })),
        ...(t.priority !== "none" ? [{ tag: PRIORITY_TAGS[t.priority] }] : []),
        ...(t.presentation.due_date_formatted
          ? [
              {
                text: {
                  value: t.presentation.due_date_formatted,
                  color: t.presentation.is_overdue ? Color.Red : undefined,
                },
              },
            ]
          : []),
        ...(primary ? [{ icon: primary.icon, tooltip: `${primary.title}: ${primary.value}` }] : []),
        ...(repeat ? [{ icon: Icon.Repeat, tooltip: `Repeats: ${repeat}` }] : []),
        ...(t.starred ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Task"
            icon={Icon.Pencil}
            target={<TaskForm task={t} parentId={parentId} onSaved={onChange} />}
          />
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
          {isParent && !t.completed && itemsDone < (items.data?.length ?? 0) ? (
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
        </ActionPanel>
      }
    />
  );
}
