import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { taskit, usesHostedApi } from "./auth";
import {
  batchTasks,
  listLists,
  taskUrl,
  type Named,
  type Priority,
  type Task,
  PRIORITIES,
} from "./tasks";

const PRIORITY_LABEL: Record<Priority, string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export function useLists() {
  return useCachedPromise(async () => {
    const api = await taskit();
    return listLists(api);
  });
}

export function TaskListItem({
  task,
  lists,
  view,
  onChanged,
}: {
  task: Task;
  lists: Named[];
  view?: string;
  onChanged: () => void;
}) {
  const when = task.dueAt ?? task.startAt;
  const whenDate = when ? new Date(when) : undefined;
  const accessories: List.Item.Accessory[] = [];
  if (task.priority && task.priority !== "none") {
    accessories.push({
      tag: {
        value: PRIORITY_LABEL[task.priority as Priority] ?? task.priority,
      },
    });
  }
  if (whenDate && !Number.isNaN(whenDate.getTime()))
    accessories.push({ date: whenDate });

  return (
    <List.Item
      id={task.id}
      title={task.title}
      icon={task.status === "completed" ? Icon.CheckCircle : Icon.Circle}
      accessories={accessories}
      actions={
        <TaskActions
          task={task}
          lists={lists}
          view={view}
          onChanged={onChanged}
        />
      }
    />
  );
}

export function TaskActions({
  task,
  lists,
  view,
  onChanged,
}: {
  task: Task;
  lists: Named[];
  view?: string;
  onChanged: () => void;
}) {
  const completed = task.status === "completed";
  const webUrl = usesHostedApi() ? taskUrl(task.id, view) : undefined;
  const destinations = [
    { id: "inbox", name: "Inbox" },
    ...lists.filter((list) => list.id !== "inbox"),
  ];

  const run = async (title: string, body: Parameters<typeof batchTasks>[1]) => {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      const api = await taskit();
      await batchTasks(api, body);
      toast.style = Toast.Style.Success;
      toast.title = title;
      onChanged();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't update task";
      toast.message =
        error instanceof Error ? error.message : "Something went wrong";
    }
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {completed ? (
          <Action
            title="Reopen"
            icon={Icon.Circle}
            onAction={() =>
              run("Reopened", { ids: [task.id], action: "reopen" })
            }
          />
        ) : (
          <Action
            title="Complete"
            icon={Icon.CheckCircle}
            onAction={() =>
              run("Completed", { ids: [task.id], action: "complete" })
            }
          />
        )}
        <Action
          title="Schedule Today"
          icon={Icon.Calendar}
          onAction={() =>
            run("Scheduled for today", {
              ids: [task.id],
              action: "scheduleToday",
            })
          }
        />
        <Action
          title="Move to Backlog"
          icon={Icon.Tray}
          onAction={() =>
            run("Moved to backlog", { ids: [task.id], action: "toBacklog" })
          }
        />
        <Action
          title="Won't Do"
          icon={Icon.XMarkCircle}
          onAction={() =>
            run("Marked won't do", { ids: [task.id], action: "wontDo" })
          }
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <ActionPanel.Submenu title="Set Priority" icon={Icon.Star}>
          {PRIORITIES.map((priority) => (
            <Action
              key={priority}
              title={PRIORITY_LABEL[priority]}
              icon={priority === task.priority ? Icon.Check : Icon.Circle}
              onAction={() =>
                run(`Priority set to ${PRIORITY_LABEL[priority]}`, {
                  ids: [task.id],
                  action: "priority",
                  priority,
                })
              }
            />
          ))}
        </ActionPanel.Submenu>
        <ActionPanel.Submenu title="Move to List" icon={Icon.ArrowRight}>
          {destinations.map((list) => (
            <Action
              key={list.id}
              title={list.name}
              icon={list.id === task.listId ? Icon.Check : Icon.Circle}
              onAction={() =>
                run(`Moved to ${list.name}`, {
                  ids: [task.id],
                  action: "move",
                  listId: list.id,
                })
              }
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
      <ActionPanel.Section>
        {webUrl ? (
          <Action.OpenInBrowser title="Open in Taskit" url={webUrl} />
        ) : null}
        <Action.CopyToClipboard title="Copy Title" content={task.title} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
