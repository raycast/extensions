import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Alert,
  Keyboard,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useCallback } from "react";
import type { TodoItem, SortOrder, GroupBy } from "./types";
import { getPriorityColor, PRIORITIES } from "./types";
import {
  readTodos,
  completeTodo,
  uncompleteTodo,
  deleteTodo,
  updateTodo,
  sortTodos,
  serializeItem,
} from "./storage";
import { useValidatedPrefs } from "./preferences";
import EditTodoForm from "./edit-todo-form";
import AddTodo from "./add-todo";

// ---------------------------------------------------------------------------
// Accessory helpers
// ---------------------------------------------------------------------------

function priorityAccessory(
  priority: string | undefined,
): List.Item.Accessory | null {
  if (!priority) return null;
  return {
    tag: { value: priority, color: getPriorityColor(priority) as Color },
    tooltip: `Priority: ${priority}`,
  };
}

function dueAccessory(dueDate: string | undefined): List.Item.Accessory | null {
  if (!dueDate) return null;
  const today = new Date().toISOString().split("T")[0];
  const overdue = dueDate < today;
  const dueToday = dueDate === today;
  return {
    tag: {
      value: dueDate,
      color: overdue
        ? Color.Red
        : dueToday
          ? Color.Orange
          : Color.SecondaryText,
    },
    tooltip: overdue ? `Overdue (was ${dueDate})` : `Due: ${dueDate}`,
  };
}

function buildAccessories(item: TodoItem): List.Item.Accessory[] {
  const acc: List.Item.Accessory[] = [];

  const p = priorityAccessory(item.priority);
  if (p) acc.push(p);

  const due = dueAccessory(item.tags["due"]);
  if (due) acc.push(due);

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

  if (item.completed && item.completionDate) {
    acc.push({
      date: new Date(item.completionDate),
      tooltip: `Completed: ${item.completionDate}`,
    });
  }

  return acc;
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

type Sections = { title: string; items: TodoItem[] }[];

function groupItems(items: TodoItem[], groupBy: GroupBy): Sections {
  if (groupBy === "none") {
    return [{ title: "All Tasks", items }];
  }

  if (groupBy === "priority") {
    const map = new Map<string, TodoItem[]>();
    for (const item of items) {
      const key = item.completed
        ? "Completed"
        : item.priority
          ? `Priority ${item.priority}`
          : "No Priority";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    const ordered: Sections = [];
    for (const p of PRIORITIES) {
      const key = `Priority ${p}`;
      if (map.has(key)) ordered.push({ title: key, items: map.get(key)! });
    }
    if (map.has("No Priority"))
      ordered.push({ title: "No Priority", items: map.get("No Priority")! });
    if (map.has("Completed"))
      ordered.push({ title: "Completed", items: map.get("Completed")! });
    return ordered;
  }

  if (groupBy === "project") {
    const map = new Map<string, TodoItem[]>();
    for (const item of items) {
      const keys = item.projects.length > 0 ? item.projects : ["No Project"];
      for (const key of keys) {
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, items]) => ({ title: `+${title}`, items }));
  }

  if (groupBy === "context") {
    const map = new Map<string, TodoItem[]>();
    for (const item of items) {
      const keys = item.contexts.length > 0 ? item.contexts : ["No Context"];
      for (const key of keys) {
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, items]) => ({ title: `@${title}`, items }));
  }

  return [{ title: "All Tasks", items }];
}

// ---------------------------------------------------------------------------
// Per-item action panel
// ---------------------------------------------------------------------------

function TodoActions({
  item,
  showCompleted,
  archiveDone,
  onComplete,
  onUncomplete,
  onDelete,
  onUpdate,
  onToggleCompleted,
  onAddNew,
  revalidate,
}: {
  item: TodoItem;
  showCompleted: boolean;
  archiveDone: boolean;
  onComplete: (item: TodoItem) => Promise<void>;
  onUncomplete: (item: TodoItem) => Promise<void>;
  onDelete: (item: TodoItem) => Promise<void>;
  onUpdate: (item: TodoItem) => Promise<void>;
  onToggleCompleted: () => void;
  onAddNew: () => void;
  revalidate: () => void;
}) {
  const { push } = useNavigation();

  return (
    <ActionPanel>
      <ActionPanel.Section title="Task">
        {!item.completed && (
          <Action
            title="Mark as Complete"
            icon={Icon.Checkmark}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => onComplete(item)}
          />
        )}
        {item.completed && !archiveDone && (
          <Action
            title="Mark as Incomplete"
            icon={Icon.Circle}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => onUncomplete(item)}
          />
        )}
        <Action
          title="Edit Task"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={() => push(<EditTodoForm item={item} onSave={onUpdate} />)}
        />
        <Action
          title="Add Task"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={onAddNew}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Set Priority">
        {PRIORITIES.slice(0, 6).map((p) => (
          <Action
            key={p}
            title={`Priority ${p}`}
            icon={{
              source: Icon.Circle,
              tintColor: getPriorityColor(p) as Color,
            }}
            onAction={() => onUpdate({ ...item, priority: p })}
          />
        ))}
        <Action
          title="Remove Priority"
          icon={Icon.XMarkCircle}
          onAction={() => onUpdate({ ...item, priority: undefined })}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Manage">
        <Action.CopyToClipboard
          title="Copy Task Text"
          content={item.text}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.CopyToClipboard
          title="Copy Raw Line"
          content={serializeItem(item)}
        />
        <Action
          title="Refresh List"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={revalidate}
        />
        <Action
          title={
            showCompleted ? "Hide Completed Tasks" : "Show Completed Tasks"
          }
          icon={showCompleted ? Icon.EyeSlash : Icon.Eye}
          shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          onAction={onToggleCompleted}
        />
        <Action
          title="Delete Task"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => onDelete(item)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Open Preferences"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export default function ListTodos() {
  const { prefs, pathsValid } = useValidatedPrefs();
  const { push } = useNavigation();

  // Single dropdown value encodes both sort and group as "sort|group"
  const initialDropdown = `${prefs.defaultSort}|${prefs.groupBy}`;
  const [dropdownValue, setDropdownValue] = useState<string>(initialDropdown);
  const [sortOrder, groupBy] = dropdownValue.split("|") as [SortOrder, GroupBy];
  const [showCompleted, setShowCompleted] = useState<boolean>(
    prefs.showCompleted,
  );

  const {
    data: todos,
    isLoading,
    revalidate,
    mutate,
  } = useCachedPromise(() => readTodos(prefs.todoFilePath), [], {
    keepPreviousData: true,
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const handleComplete = useCallback(
    async (item: TodoItem) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Completing task…",
      });
      try {
        await mutate(
          completeTodo(
            prefs.todoFilePath,
            prefs.doneFilePath,
            item,
            prefs.archiveDone,
          ),
          {
            optimisticUpdate: (current) => {
              if (!current) return current;
              if (prefs.archiveDone)
                return current.filter((t) => t.lineNumber !== item.lineNumber);
              const today = new Date().toISOString().split("T")[0];
              return current.map((t) =>
                t.lineNumber === item.lineNumber
                  ? { ...t, completed: true, completionDate: today }
                  : t,
              );
            },
          },
        );
        toast.style = Toast.Style.Success;
        toast.title = prefs.archiveDone
          ? "Task archived to done.txt"
          : "Task marked complete";
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to complete task";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    },
    [prefs, mutate],
  );

  const handleUncomplete = useCallback(
    async (item: TodoItem) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Marking incomplete…",
      });
      try {
        await mutate(uncompleteTodo(prefs.todoFilePath, item), {
          optimisticUpdate: (current) =>
            current?.map((t) =>
              t.lineNumber === item.lineNumber
                ? { ...t, completed: false, completionDate: undefined }
                : t,
            ),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Task marked incomplete";
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update task";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    },
    [prefs, mutate],
  );

  const handleDelete = useCallback(
    async (item: TodoItem) => {
      const confirmed = await confirmAlert({
        title: "Delete Task",
        message: `"${item.text}" will be permanently deleted.`,
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
        await mutate(deleteTodo(prefs.todoFilePath, item), {
          optimisticUpdate: (current) =>
            current?.filter((t) => t.lineNumber !== item.lineNumber),
        });
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

  const handleUpdate = useCallback(
    async (updated: TodoItem) => {
      const itemWithRaw = { ...updated, raw: serializeItem(updated) };
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating task…",
      });
      try {
        await mutate(updateTodo(prefs.todoFilePath, itemWithRaw), {
          optimisticUpdate: (current) =>
            current?.map((t) => (t.id === itemWithRaw.id ? itemWithRaw : t)),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Task updated";
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update task";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    },
    [prefs, mutate],
  );

  const handleAddNew = useCallback(() => {
    push(<AddTodo onAdd={revalidate} />);
  }, [push, revalidate]);

  // ---------------------------------------------------------------------------
  // Filtering & sorting
  // ---------------------------------------------------------------------------

  const allItems = todos ?? [];
  const filtered = showCompleted
    ? allItems
    : allItems.filter((t) => !t.completed);
  const sorted = sortTodos(filtered, sortOrder);
  const sections = groupItems(sorted, groupBy);
  const pendingCount = allItems.filter((i) => !i.completed).length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${pendingCount} pending task${pendingCount !== 1 ? "s" : ""}…`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort & Group"
          value={dropdownValue}
          onChange={setDropdownValue}
        >
          <List.Dropdown.Section title="Sort by Priority">
            <List.Dropdown.Item
              title="Priority — Group by Priority"
              value="priority|priority"
              icon={Icon.ArrowUp}
            />
            <List.Dropdown.Item
              title="Priority — Group by Project"
              value="priority|project"
              icon={Icon.ArrowUp}
            />
            <List.Dropdown.Item
              title="Priority — Group by Context"
              value="priority|context"
              icon={Icon.ArrowUp}
            />
            <List.Dropdown.Item
              title="Priority — No Grouping"
              value="priority|none"
              icon={Icon.ArrowUp}
            />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Sort by Due Date">
            <List.Dropdown.Item
              title="Due Date — Group by Priority"
              value="due-date|priority"
              icon={Icon.Calendar}
            />
            <List.Dropdown.Item
              title="Due Date — Group by Project"
              value="due-date|project"
              icon={Icon.Calendar}
            />
            <List.Dropdown.Item
              title="Due Date — Group by Context"
              value="due-date|context"
              icon={Icon.Calendar}
            />
            <List.Dropdown.Item
              title="Due Date — No Grouping"
              value="due-date|none"
              icon={Icon.Calendar}
            />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Sort by Creation Date">
            <List.Dropdown.Item
              title="Newest First — No Grouping"
              value="creation-date-desc|none"
              icon={Icon.Clock}
            />
            <List.Dropdown.Item
              title="Oldest First — No Grouping"
              value="creation-date-asc|none"
              icon={Icon.Clock}
            />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Sort Alphabetically">
            <List.Dropdown.Item
              title="A → Z — Group by Priority"
              value="alpha|priority"
              icon={Icon.Text}
            />
            <List.Dropdown.Item
              title="A → Z — Group by Project"
              value="alpha|project"
              icon={Icon.Text}
            />
            <List.Dropdown.Item
              title="A → Z — Group by Context"
              value="alpha|context"
              icon={Icon.Text}
            />
            <List.Dropdown.Item
              title="A → Z — No Grouping"
              value="alpha|none"
              icon={Icon.Text}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {sections.map((section) => (
        <List.Section
          key={section.title}
          title={section.title}
          subtitle={`${section.items.length}`}
        >
          {section.items.map((item) => (
            <List.Item
              key={item.id}
              id={item.id}
              icon={
                item.completed
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : item.priority
                    ? {
                        source: Icon.Circle,
                        tintColor: getPriorityColor(item.priority) as Color,
                      }
                    : Icon.Circle
              }
              title={item.text || item.description}
              subtitle={
                item.completed
                  ? item.completionDate
                    ? `Completed ${item.completionDate}`
                    : "Completed"
                  : item.creationDate
                    ? `Created ${item.creationDate}`
                    : undefined
              }
              accessories={buildAccessories(item)}
              actions={
                <TodoActions
                  item={item}
                  showCompleted={showCompleted}
                  archiveDone={prefs.archiveDone}
                  onComplete={handleComplete}
                  onUncomplete={handleUncomplete}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                  onToggleCompleted={() => setShowCompleted((v) => !v)}
                  onAddNew={handleAddNew}
                  revalidate={revalidate}
                />
              }
            />
          ))}
        </List.Section>
      ))}

      {!isLoading && !pathsValid && (
        <List.EmptyView
          title="Configuration Error"
          description="Your todo.txt file path is invalid. Open Preferences to fix it."
          icon={Icon.ExclamationMark}
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
      {!isLoading && pathsValid && allItems.length === 0 && (
        <List.EmptyView
          title="No Tasks"
          description="Press ⌘N to add your first task."
          icon={Icon.CheckCircle}
          actions={
            <ActionPanel>
              <Action
                title="Add Task"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={handleAddNew}
              />
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
