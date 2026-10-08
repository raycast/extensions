import { Color, MenuBarExtra, LaunchType, launchCommand, LocalStorage, open } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { myTasks } from "./api";
import { getConfig } from "./preferences";
import type { TaskLite } from "./types";
import { statusIconFor } from "./ui";

export default function Command() {
  const [loading, setLoading] = useState(true);
  const [showCount, setShowCount] = useState(true);
  const [showDueDateInTitle, setShowDueDateInTitle] = useState(true);
  const [showSubtasksInTitle, setShowSubtasksInTitle] = useState(true);
  const [items, setItems] = useState<TaskLite[]>([]);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [sortMode, setSortMode] = useState<"default" | "due" | "status">("default");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const saved = await LocalStorage.getItem<string>("menuBar.showCount");
        if (!cancelled && typeof saved === "string") {
          const next = saved === "true";
          if (next !== showCount) setShowCount(next);
        }
        const savedDue = await LocalStorage.getItem<string>("menuBar.showDueDateInTitle");
        if (!cancelled && typeof savedDue === "string") {
          const next = savedDue === "true";
          if (next !== showDueDateInTitle) setShowDueDateInTitle(next);
        }
        const savedSubtasks = await LocalStorage.getItem<string>("menuBar.showSubtasksInTitle");
        if (!cancelled && typeof savedSubtasks === "string") {
          const next = savedSubtasks === "true";
          if (next !== showSubtasksInTitle) setShowSubtasksInTitle(next);
        }
        const savedSort = await LocalStorage.getItem<string>("menuBar.sortMode");
        if (
          !cancelled &&
          typeof savedSort === "string" &&
          (savedSort === "default" || savedSort === "due" || savedSort === "status")
        ) {
          setSortMode(savedSort);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setPrefsLoaded(true);
      }
    })();

    async function refresh() {
      if (cancelled) return;
      try {
        const cfg = getConfig();
        const resp = await myTasks(cfg);
        if (!cancelled) {
          setItems(resp);
        }
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    }

    void refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  function formatRelativeDate(ts?: number | null): string | undefined {
    if (!ts) return undefined;
    const startOfDay = (d: Date) => {
      const nd = new Date(d);
      nd.setHours(0, 0, 0, 0);
      return nd;
    };
    const due = startOfDay(new Date(ts));
    const today = startOfDay(new Date());
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 1) return `in ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  }

  // Use shared status icon helper

  const sortedItems = useMemo(() => {
    const byDefault = (a: TaskLite, b: TaskLite) =>
      (Number(b.sortOrder ?? b._creationTime) || 0) - (Number(a.sortOrder ?? a._creationTime) || 0);
    const byDue = (a: TaskLite, b: TaskLite) => {
      const ad = typeof a.dueDate === "number" ? a.dueDate : Number.POSITIVE_INFINITY;
      const bd = typeof b.dueDate === "number" ? b.dueDate : Number.POSITIVE_INFINITY;
      if (ad !== bd) return ad - bd; // earlier first
      return byDefault(a, b);
    };
    const statusOrder: Record<string, number> = {
      todo: 0,
      progress: 1,
      review: 2,
      done: 3,
    };
    const byStatus = (a: TaskLite, b: TaskLite) => {
      const as = statusOrder[a.status] ?? 99;
      const bs = statusOrder[b.status] ?? 99;
      if (as !== bs) return as - bs;
      return byDefault(a, b);
    };
    const arr = [...items];
    switch (sortMode) {
      case "due":
        arr.sort(byDue);
        break;
      case "status":
        arr.sort(byStatus);
        break;
      case "default":
      default:
        arr.sort(byDefault);
        break;
    }
    return arr;
  }, [items, sortMode]);

  const sortModeLabel = (m: typeof sortMode) => (m === "default" ? "Default" : m === "due" ? "Due Date" : "Status");

  const MAX_ITEMS = 20;

  return (
    <MenuBarExtra
      icon={{ source: "list-icon.png", tintColor: Color.PrimaryText }}
      isLoading={loading || !prefsLoaded}
      title={showCount && !loading ? String(items.length) : undefined}
      tooltip="My Tasks"
    >
      <MenuBarExtra.Section title="My Tasks">
        {prefsLoaded &&
          !loading &&
          sortedItems.slice(0, MAX_ITEMS).map((t) => (
            <MenuBarExtra.Submenu
              key={t._id}
              title={(function () {
                const parts: Array<string> = [t.title];
                const due = showDueDateInTitle ? formatRelativeDate(t.dueDate) : undefined;
                if (due) parts.push(due);
                if (showSubtasksInTitle && t.hasSubtasks) {
                  const sc = typeof t.subtasksCompleted === "number" ? t.subtasksCompleted : undefined;
                  const st = typeof t.subtasksTotal === "number" ? t.subtasksTotal : undefined;
                  const sub = typeof sc === "number" && typeof st === "number" ? `${sc}/${st}` : "Subtasks";
                  parts.push(sub);
                }
                return parts.join(" • ");
              })()}
              icon={statusIconFor(t)}
            >
              {!showDueDateInTitle && formatRelativeDate(t.dueDate) ? (
                <MenuBarExtra.Item title={`Due ${formatRelativeDate(t.dueDate)}`} />
              ) : null}

              <MenuBarExtra.Item
                title="Open Task"
                onAction={async () => {
                  await launchCommand({
                    name: "my-tasks",
                    type: LaunchType.UserInitiated,
                    context: { task: t },
                  });
                }}
              />

              {t.hasSubtasks ? (
                <MenuBarExtra.Item
                  title="Manage Subtasks"
                  onAction={async () => {
                    await launchCommand({
                      name: "my-tasks",
                      type: LaunchType.UserInitiated,
                      context: { task: t, openSubtasks: true },
                    });
                  }}
                />
              ) : null}
            </MenuBarExtra.Submenu>
          ))}
        {items.length === 0 && !loading ? <MenuBarExtra.Item title="No Tasks" /> : null}
        {items.length > MAX_ITEMS ? (
          <MenuBarExtra.Item
            title={`View ${items.length - MAX_ITEMS} more...`}
            onAction={async () => {
              await launchCommand({
                name: "my-tasks",
                type: LaunchType.UserInitiated,
              });
            }}
          />
        ) : null}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Submenu title="Options">
          <MenuBarExtra.Submenu title={`Sort: ${sortModeLabel(sortMode)}`}>
            <MenuBarExtra.Item
              title="Default"
              onAction={async () => {
                setSortMode("default");
                await LocalStorage.setItem("menuBar.sortMode", "default");
              }}
            />
            <MenuBarExtra.Item
              title="Due Date"
              onAction={async () => {
                setSortMode("due");
                await LocalStorage.setItem("menuBar.sortMode", "due");
              }}
            />
            <MenuBarExtra.Item
              title="Status"
              onAction={async () => {
                setSortMode("status");
                await LocalStorage.setItem("menuBar.sortMode", "status");
              }}
            />
          </MenuBarExtra.Submenu>
          <MenuBarExtra.Item
            title={showDueDateInTitle ? "Hide Due Date" : "Show Due Date"}
            onAction={async () => {
              const next = !showDueDateInTitle;
              await LocalStorage.setItem("menuBar.showDueDateInTitle", String(next));
              setShowDueDateInTitle(next);
            }}
          />
          <MenuBarExtra.Item
            title={showSubtasksInTitle ? "Hide Subtasks" : "Show Subtasks"}
            onAction={async () => {
              const next = !showSubtasksInTitle;
              await LocalStorage.setItem("menuBar.showSubtasksInTitle", String(next));
              setShowSubtasksInTitle(next);
            }}
          />
          <MenuBarExtra.Item
            title={showCount ? "Hide Tasks Count" : "Show Tasks Count"}
            onAction={async () => {
              const next = !showCount;
              await LocalStorage.setItem("menuBar.showCount", String(next));
              setShowCount(next);
            }}
          />
        </MenuBarExtra.Submenu>
        <MenuBarExtra.Item
          title={"Create Task"}
          shortcut={{ modifiers: [], key: "c" }}
          onAction={async () => {
            await launchCommand({
              name: "create-task",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item
          title="Visit"
          subtitle="mise.work"
          shortcut={{ modifiers: [], key: "v" }}
          onAction={() => open("https://mise.work/overview")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
