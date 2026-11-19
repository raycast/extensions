import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  Keyboard,
} from "@raycast/api";
import {
  getProgressIcon,
  showFailureToast,
  useCachedPromise,
} from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  closeTodo,
  getProjectColor,
  getTodos,
  reopenTodo,
  type Todo,
} from "./api";
import { ListErrorView } from "./error-view";

type StatusFilter = "open" | "closed" | "all";

function formatDueDate(due?: string): string | undefined {
  if (!due) return undefined;
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString();
}

function dueAccessory(due?: string): List.Item.Accessory | null {
  const text = formatDueDate(due);
  if (!text || !due) return null;
  const isOverdue = new Date(due).getTime() < Date.now();
  return {
    text,
    icon: {
      source: Icon.Calendar,
      tintColor: isOverdue ? Color.Red : Color.SecondaryText,
    },
  };
}

export default function Todos() {
  const [filter, setFilter] = useState<StatusFilter>("open");
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (status: StatusFilter) =>
      getTodos(status === "all" ? undefined : { status }),
    [filter],
    {
      keepPreviousData: true,
      initialData: [] as Todo[],
      failureToastOptions: { title: "Failed to load todos" },
    },
  );

  async function handleClose(todo: Todo) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Closing todo...",
      });
      await closeTodo(todo.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Todo closed",
        message: todo.name,
      });
      revalidate();
    } catch (error) {
      showFailureToast(error, { title: "Failed to close todo" });
    }
  }

  async function handleReopen(todo: Todo) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Reopening todo...",
      });
      await reopenTodo(todo.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Todo reopened",
        message: todo.name,
      });
      revalidate();
    } catch (error) {
      showFailureToast(error, { title: "Failed to reopen todo" });
    }
  }

  const grouped = useMemo(() => {
    return data.reduce(
      (acc, todo) => {
        const projectTitle = todo.project?.title || "No Project";
        if (!acc[projectTitle]) acc[projectTitle] = [];
        acc[projectTitle].push(todo);
        return acc;
      },
      {} as Record<string, Todo[]>,
    );
  }, [data]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search todos..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Status"
          storeValue
          onChange={(value) => setFilter(value as StatusFilter)}
        >
          <List.Dropdown.Item title="Open" value="open" />
          <List.Dropdown.Item title="Closed" value="closed" />
          <List.Dropdown.Item title="All" value="all" />
        </List.Dropdown>
      }
    >
      {error && (
        <ListErrorView error={error} what="todos" onRetry={revalidate} />
      )}
      {Object.entries(grouped).map(([project, items]) => (
        <List.Section key={project} title={project}>
          {items.map((todo) => {
            const closed = todo.status > 0;
            const accessories: List.Item.Accessory[] = [];
            const due = dueAccessory(todo.dueDate);
            if (due) accessories.push(due);
            if (typeof todo.progress === "number" && todo.progress > 0) {
              accessories.push({
                text: `${Math.round(todo.progress)}%`,
                icon: getProgressIcon(todo.progress / 100, Color.Green),
              });
            }
            return (
              <List.Item
                key={todo.id}
                icon={{
                  source: closed ? Icon.CheckCircle : Icon.Circle,
                  tintColor: closed
                    ? Color.Green
                    : getProjectColor(todo.project?.color ?? 0),
                }}
                title={todo.name}
                subtitle={todo.description}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    {closed ? (
                      <Action
                        title="Reopen Todo"
                        icon={Icon.ArrowCounterClockwise}
                        onAction={() => handleReopen(todo)}
                      />
                    ) : (
                      <Action
                        title="Mark as Closed"
                        icon={Icon.CheckCircle}
                        onAction={() => handleClose(todo)}
                      />
                    )}
                    <Action.OpenInBrowser
                      title="Open in Timesheet"
                      url={`https://my.timesheet.io/todos/show/${todo.id}`}
                    />
                    <Action.CopyToClipboard
                      title="Copy Todo ID"
                      content={todo.id}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={() => revalidate()}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
