import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Keyboard,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useState } from "react";
import type { TodoItem } from "./types";
import { getPriorityColor } from "./types";
import {
  readDoneTodos,
  restoreTodo,
  deleteDoneTodo,
  serializeItem,
} from "./storage";
import { useValidatedPrefs } from "./preferences";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAccessories(item: TodoItem): List.Item.Accessory[] {
  const acc: List.Item.Accessory[] = [];

  if (item.priority) {
    acc.push({
      tag: {
        value: item.priority,
        color: getPriorityColor(item.priority) as Color,
      },
      tooltip: `Priority: ${item.priority}`,
    });
  }

  if (item.completionDate) {
    acc.push({
      date: new Date(item.completionDate),
      tooltip: `Completed: ${item.completionDate}`,
    });
  }

  if (item.projects.length > 0) {
    acc.push({
      text: item.projects.map((p) => `+${p}`).join(" "),
      icon: Icon.Tag,
      tooltip: `Projects: ${item.projects.join(", ")}`,
    });
  }

  if (item.contexts.length > 0) {
    acc.push({
      text: item.contexts.map((c) => `@${c}`).join(" "),
      icon: Icon.Person,
      tooltip: `Contexts: ${item.contexts.join(", ")}`,
    });
  }

  return acc;
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

type DoneSort =
  | "completion-date-desc"
  | "completion-date-asc"
  | "priority"
  | "creation-date-desc"
  | "alpha";

function sortDone(items: TodoItem[], order: DoneSort): TodoItem[] {
  const copy = [...items];
  switch (order) {
    case "completion-date-desc":
      return copy.sort((a, b) =>
        (b.completionDate ?? "").localeCompare(a.completionDate ?? ""),
      );
    case "completion-date-asc":
      return copy.sort((a, b) =>
        (a.completionDate ?? "").localeCompare(b.completionDate ?? ""),
      );
    case "priority":
      return copy.sort((a, b) =>
        (a.priority ?? "ZZ").localeCompare(b.priority ?? "ZZ"),
      );
    case "creation-date-desc":
      return copy.sort((a, b) =>
        (b.creationDate ?? "").localeCompare(a.creationDate ?? ""),
      );
    case "alpha":
      return copy.sort((a, b) =>
        a.text.toLowerCase().localeCompare(b.text.toLowerCase()),
      );
    default:
      return copy;
  }
}

export default function ListDone() {
  const { prefs } = useValidatedPrefs();
  const [sortOrder, setSortOrder] = useState<DoneSort>("completion-date-desc");

  const {
    data: items,
    isLoading,
    mutate,
  } = useCachedPromise(
    () => readDoneTodos(prefs.todoFilePath, prefs.doneFilePath),
    [],
    { keepPreviousData: true },
  );

  const allItems = items ?? [];
  const sorted = sortDone(allItems, sortOrder);

  const handleRestore = useCallback(
    async (item: TodoItem) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Restoring task…",
      });
      try {
        await mutate(
          restoreTodo(prefs.todoFilePath, prefs.doneFilePath, item),
          {
            optimisticUpdate: (current) =>
              current?.filter((t) => t.lineNumber !== item.lineNumber),
          },
        );
        toast.style = Toast.Style.Success;
        toast.title = "Task restored to todo.txt";
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to restore task";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    },
    [prefs, mutate],
  );

  const handleDelete = useCallback(
    async (item: TodoItem) => {
      const confirmed = await confirmAlert({
        title: "Permanently Delete Task",
        message: `"${item.text}" will be removed from done.txt forever.`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting task…",
      });
      try {
        await mutate(
          deleteDoneTodo(prefs.todoFilePath, prefs.doneFilePath, item),
          {
            optimisticUpdate: (current) =>
              current?.filter((t) => t.lineNumber !== item.lineNumber),
          },
        );
        toast.style = Toast.Style.Success;
        toast.title = "Task deleted";
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete task";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    },
    [prefs, mutate],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${allItems.length} completed task${allItems.length !== 1 ? "s" : ""}…`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort"
          value={sortOrder}
          onChange={(val) => setSortOrder(val as DoneSort)}
        >
          <List.Dropdown.Item
            title="Completed Date (Newest)"
            value="completion-date-desc"
            icon={Icon.Clock}
          />
          <List.Dropdown.Item
            title="Completed Date (Oldest)"
            value="completion-date-asc"
            icon={Icon.Clock}
          />
          <List.Dropdown.Item
            title="Priority"
            value="priority"
            icon={Icon.ArrowUp}
          />
          <List.Dropdown.Item
            title="Creation Date (Newest)"
            value="creation-date-desc"
            icon={Icon.Calendar}
          />
          <List.Dropdown.Item
            title="Alphabetical"
            value="alpha"
            icon={Icon.Text}
          />
        </List.Dropdown>
      }
    >
      {sorted.map((item) => (
        <List.Item
          key={item.id}
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title={item.text || item.description}
          subtitle={
            item.creationDate ? `Created ${item.creationDate}` : undefined
          }
          accessories={buildAccessories(item)}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Task">
                <Action
                  title="Restore to Todo.txt"
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => handleRestore(item)}
                />
                <Action.CopyToClipboard
                  title="Copy Task Text"
                  content={item.text}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.CopyToClipboard
                  title="Copy Raw Line"
                  content={serializeItem(item)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Permanently"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleDelete(item)}
                />
                <Action
                  title="Open Preferences"
                  icon={Icon.Gear}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}

      {!isLoading && allItems.length === 0 && (
        <List.EmptyView
          title="No Completed Tasks"
          description={
            prefs.archiveDone
              ? "Completed tasks will appear here after being archived to done.txt."
              : "Enable 'Archive to done.txt' in Preferences to track completed tasks here."
          }
          icon={Icon.Checkmark}
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
