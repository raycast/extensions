import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import type { ChecklistItem, Task } from "../types.js";
import { formatTaskDate } from "../utils/date.js";
import { isChecklistItemCompleted, priorityAccessory, priorityLabel } from "../utils/task.js";

export function TaskListItem({
  task,
  onComplete,
  onUpdateChecklistItem,
  onRefresh,
}: {
  task: Task;
  onComplete?: (task: Task) => Promise<void>;
  onUpdateChecklistItem?: (task: Task, itemIndex: number, status: number) => Promise<void>;
  onRefresh?: () => Promise<void>;
}) {
  const priority = priorityAccessory(task.priority);
  const checklist = task.items ?? [];
  const completedChecklistCount = checklist.filter(isChecklistItemCompleted).length;
  const detail = taskDetailMarkdown(task);

  return (
    <List.Item
      icon={Icon.Circle}
      title={task.title}
      subtitle={task.content || task.desc}
      accessories={[
        ...(priority ? [priority] : []),
        ...(checklist.length > 0
          ? [
              {
                text: `${completedChecklistCount}/${checklist.length}`,
                icon: Icon.CheckList,
              },
            ]
          : []),
        task.dueDate
          ? {
              text: formatTaskDate(task.dueDate),
              icon: { source: Icon.Calendar, tintColor: Color.Blue },
            }
          : { text: "No date" },
      ]}
      detail={<List.Item.Detail markdown={detail} />}
      actions={
        <ActionPanel>
          {onComplete ? (
            <Action title="Complete Task" icon={Icon.CheckCircle} onAction={() => onComplete(task)} />
          ) : null}
          <ChecklistActions task={task} onUpdateChecklistItem={onUpdateChecklistItem} />
          <Action.CopyToClipboard
            title="Copy Task Title"
            content={task.title}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
          <Action.CopyToClipboard
            title="Copy Task ID"
            content={`taskId=${task.id}\nprojectId=${task.projectId}\npriority=${priorityLabel(task.priority)}`}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          {onRefresh ? (
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function ChecklistActions({
  task,
  onUpdateChecklistItem,
}: {
  task: Task;
  onUpdateChecklistItem?: (task: Task, itemIndex: number, status: number) => Promise<void>;
}) {
  const items = task.items ?? [];

  if (!onUpdateChecklistItem || items.length === 0) {
    return null;
  }

  const openItems = indexedChecklistItems(items).filter(({ item }) => !isChecklistItemCompleted(item));
  const completedItems = indexedChecklistItems(items).filter(({ item }) => isChecklistItemCompleted(item));

  return (
    <>
      {openItems.length > 0 ? (
        <ActionPanel.Submenu title="Complete Checklist Item" icon={Icon.CheckList}>
          {openItems.map(({ item, index }) => (
            <Action
              key={`complete:${item.id ?? index}`}
              title={item.title}
              icon={Icon.CheckCircle}
              onAction={() => onUpdateChecklistItem(task, index, 2)}
            />
          ))}
        </ActionPanel.Submenu>
      ) : null}
      {completedItems.length > 0 ? (
        <ActionPanel.Submenu title="Reopen Checklist Item" icon={Icon.ArrowCounterClockwise}>
          {completedItems.map(({ item, index }) => (
            <Action
              key={`reopen:${item.id ?? index}`}
              title={item.title}
              icon={Icon.Circle}
              onAction={() => onUpdateChecklistItem(task, index, 0)}
            />
          ))}
        </ActionPanel.Submenu>
      ) : null}
    </>
  );
}

function indexedChecklistItems(items: ChecklistItem[]) {
  return items.map((item, index) => ({ item, index }));
}

function taskDetailMarkdown(task: Task): string {
  const notes = task.content || task.desc || "";
  const checklist = task.items
    ?.map((item) => `- [${isChecklistItemCompleted(item) ? "x" : " "}] ${escapeMarkdown(item.title)}`)
    .join("\n");

  return [notes, checklist].filter(Boolean).join("\n\n");
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}
