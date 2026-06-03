import {
  MenuBarExtra,
  Icon,
  Color,
  openCommandPreferences,
  launchCommand,
  LaunchType,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { readTodos, completeTodo, sortTodos } from "./storage";
import { getCachedTodos } from "./cache";
import { useValidatedPrefs } from "./preferences";
import { getPriorityColor } from "./types";
import type { TodoItem } from "./types";

const MAX_ITEMS = 10;

function itemTitle(item: TodoItem): string {
  const priority = item.priority ? `(${item.priority}) ` : "";
  const due = item.tags["due"] ? ` — due ${item.tags["due"]}` : "";
  return `${priority}${item.text || item.description}${due}`;
}

export default function MenuBar() {
  const { prefs } = useValidatedPrefs();

  // Seed state synchronously from cache — menu bar title is correct on first frame
  const [todos, setTodos] = useState<TodoItem[]>(() => getCachedTodos());

  const { data: freshTodos, revalidate } = usePromise(() =>
    readTodos(prefs.todoFilePath),
  );

  // Whenever the async fetch completes, update local state
  useEffect(() => {
    if (freshTodos) setTodos(freshTodos);
  }, [freshTodos]);

  const pending = todos.filter((t) => !t.completed);
  const today = new Date().toISOString().split("T")[0];
  const overdue = pending.filter((t) => {
    const due = t.tags["due"];
    return due ? due < today : false;
  });

  const sorted = sortTodos(pending, "priority");
  const nonOverdue = sorted.filter((t) => {
    const due = t.tags["due"];
    return !(due && due < today);
  });
  const topItems = nonOverdue.slice(0, MAX_ITEMS);

  async function handleComplete(item: TodoItem) {
    // Optimistically update local state immediately
    setTodos((current) => {
      if (prefs.archiveDone)
        return current.filter((t) => t.lineNumber !== item.lineNumber);
      return current.map((t) =>
        t.lineNumber === item.lineNumber
          ? { ...t, completed: true, completionDate: today }
          : t,
      );
    });
    try {
      await completeTodo(
        prefs.todoFilePath,
        prefs.doneFilePath,
        item,
        prefs.archiveDone,
      );
      revalidate();
      await showHUD(`Completed: ${item.text}`);
    } catch {
      // Roll back on failure
      revalidate();
      await showHUD("Failed to complete task");
    }
  }

  const count = pending.length;
  const title = count > 0 ? String(count) : undefined;
  const icon =
    overdue.length > 0
      ? { source: Icon.ExclamationMark, tintColor: Color.Red }
      : {
          source: Icon.CheckCircle,
          tintColor: count > 0 ? Color.PrimaryText : Color.Green,
        };

  return (
    <MenuBarExtra
      icon={icon}
      title={title}
      tooltip={`${count} pending task${count !== 1 ? "s" : ""}${overdue.length > 0 ? `, ${overdue.length} overdue` : ""}`}
    >
      <MenuBarExtra.Section
        title={`${count} Pending Task${count !== 1 ? "s" : ""}`}
      >
        {topItems.map((item) => (
          <MenuBarExtra.Item
            key={item.id}
            title={itemTitle(item)}
            icon={
              item.priority
                ? {
                    source: Icon.Circle,
                    tintColor: getPriorityColor(item.priority) as Color,
                  }
                : Icon.Circle
            }
            onAction={() => handleComplete(item)}
            tooltip="Click to mark complete"
          />
        ))}
        {sorted.length > MAX_ITEMS && (
          <MenuBarExtra.Item
            title={`… and ${sorted.length - MAX_ITEMS} more`}
            icon={Icon.Ellipsis}
            onAction={() =>
              launchCommand({
                name: "list-todos",
                type: LaunchType.UserInitiated,
              })
            }
          />
        )}
        {count === 0 && (
          <MenuBarExtra.Item
            title="All done! No pending tasks."
            icon={Icon.Checkmark}
            onAction={() => {}}
          />
        )}
      </MenuBarExtra.Section>

      {overdue.length > 0 && (
        <MenuBarExtra.Section title={`${overdue.length} Overdue`}>
          {overdue.slice(0, 5).map((item) => (
            <MenuBarExtra.Item
              key={`overdue-${item.id}`}
              title={itemTitle(item)}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              onAction={() => handleComplete(item)}
              tooltip={`Overdue since ${item.tags["due"]}`}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Add New Task"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() =>
            launchCommand({ name: "quick-add", type: LaunchType.UserInitiated })
          }
        />
        <MenuBarExtra.Item
          title="Open Task List"
          icon={Icon.List}
          onAction={() =>
            launchCommand({
              name: "list-todos",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={revalidate}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Preferences"
          icon={Icon.Gear}
          onAction={() => openCommandPreferences()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
