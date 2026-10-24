import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  fetchToday,
  SocketUnavailableError,
  startTimer,
  stopTimer,
  Task,
  toggleTask,
} from "./client";
import { openDeepLink } from "./deeplink";

// statusCategory comes lowercase over the socket: "backlog" | "todo" | ... | "completed"
const CLOSED_CATEGORIES = new Set(["completed", "canceled", "duplicate"]);

function sectionTitle(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// Linear's priority scale, same glyphs as the app: urgent = red "!",
// high/medium/low = 3/2/1 stacked bars, 0/null = no slot.
function priorityAccessory(
  priority: Task["priority"],
): List.Item.Accessory | null {
  switch (priority) {
    case 1:
      return {
        icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
        tooltip: "Priority: Urgent",
      };
    case 2:
      return { icon: Icon.StackedBars3, tooltip: "Priority: High" };
    case 3:
      return { icon: Icon.StackedBars2, tooltip: "Priority: Medium" };
    case 4:
      return { icon: Icon.StackedBars1, tooltip: "Priority: Low" };
    default:
      return null;
  }
}

// Status glyph, mirroring the app's StateRing (Raycast Linear style):
// shape + colour encode the status category.
function statusIcon(task: Task): List.Item.Props["icon"] {
  const tooltip = task.statusName ?? sectionTitle(task.statusCategory);
  switch (task.statusCategory.toLowerCase()) {
    case "completed":
      return {
        value: { source: Icon.CheckCircle, tintColor: Color.Green },
        tooltip,
      };
    case "canceled":
      return {
        value: { source: Icon.XMarkCircleFilled, tintColor: Color.Red },
        tooltip,
      };
    case "duplicate":
      return {
        value: { source: Icon.Duplicate, tintColor: Color.SecondaryText },
        tooltip,
      };
    case "started":
      return {
        value: { source: Icon.CircleProgress50, tintColor: Color.Yellow },
        tooltip,
      };
    case "paused":
      return {
        value: { source: Icon.PauseFilled, tintColor: Color.Orange },
        tooltip,
      };
    case "backlog":
      // Custom asset: the app's dashed ring; no stock Raycast icon matches
      // (CircleDisabled reads as "canceled").
      return {
        value: { source: "backlog-ring.png", tintColor: Color.SecondaryText },
        tooltip,
      };
    default:
      return {
        value: { source: Icon.Circle, tintColor: Color.SecondaryText },
        tooltip,
      };
  }
}

// Same brand icons as the app renders for external sources; "local" rows
// carry no badge in the app, so none here either. Each icon ships as
// `<name>.png` + `<name>@dark.png` — Raycast switches per theme by itself.
const SOURCE_ICONS = new Set(["linear", "jira", "youtrack", "obsidian"]);

function sourceAccessory(source: string | null): List.Item.Accessory | null {
  if (!source || source === "local") return null;
  if (!SOURCE_ICONS.has(source)) return { tag: source };
  return {
    icon: `sources/${source}.png`,
    tooltip: source.charAt(0).toUpperCase() + source.slice(1),
  };
}

// scheduledAt is a local civil datetime "YYYY-MM-DDTHH:MM"; end = start + durationMin.
function scheduleAccessory(task: Task): List.Item.Accessory | null {
  if (!task.scheduledAt) return null;
  const start = task.scheduledAt.slice(11, 16);
  if (!start) return null;
  let text = start;
  if (task.durationMin && task.durationMin > 0) {
    const [h, m] = start.split(":").map(Number);
    const endMin = (h * 60 + m + task.durationMin) % (24 * 60);
    const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(
      endMin % 60,
    ).padStart(2, "0")}`;
    text = `${start} – ${end}`;
  }
  return { icon: Icon.Clock, text, tooltip: "Scheduled" };
}

function accessories(task: Task): List.Item.Accessory[] {
  const out: List.Item.Accessory[] = [];
  if (task.timerRunning) {
    out.push({
      icon: { source: Icon.Stopwatch, tintColor: Color.Green },
      tooltip: "Timer running",
    });
  }
  if (task.trackedMin > 0) {
    out.push({ text: `${task.trackedMin}m`, tooltip: "Tracked time" });
  }
  const prio = priorityAccessory(task.priority);
  if (prio) out.push(prio);
  const schedule = scheduleAccessory(task);
  if (schedule) out.push(schedule);
  const source = sourceAccessory(task.source);
  if (source) out.push(source);
  return out;
}

/** Group tasks by statusCategory keeping app order; open sections first. */
function sections(tasks: Task[]): { category: string; tasks: Task[] }[] {
  const byCategory = new Map<string, Task[]>();
  for (const t of tasks) {
    const key = t.statusCategory.toLowerCase();
    const bucket = byCategory.get(key);
    if (bucket) bucket.push(t);
    else byCategory.set(key, [t]);
  }
  const all = [...byCategory.entries()].map(([category, ts]) => ({
    category,
    tasks: ts,
  }));
  return [
    ...all.filter((s) => !CLOSED_CATEGORIES.has(s.category)),
    ...all.filter((s) => CLOSED_CATEGORIES.has(s.category)),
  ];
}

export default function Command() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [socketDown, setSocketDown] = useState(false);

  const revalidate = useCallback(async () => {
    setIsLoading(true);
    try {
      setTasks(await fetchToday());
      setSocketDown(false);
    } catch (err) {
      if (err instanceof SocketUnavailableError) {
        setSocketDown(true);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Dondori error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void revalidate();
  }, [revalidate]);

  const act = useCallback(
    async (label: string, fn: () => Promise<void>, successTitle: string) => {
      try {
        await fn();
        await revalidate();
        await showToast({
          style: Toast.Style.Success,
          title: successTitle,
        });
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: `${label} failed`,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [revalidate],
  );

  return (
    <List isLoading={isLoading}>
      {tasks.length === 0 ? (
        <List.EmptyView
          icon={socketDown ? Icon.Plug : Icon.CheckCircle}
          title={socketDown ? "Dondori is not reachable" : "No tasks for today"}
          description={
            socketDown
              ? "Launch Dondori and enable Raycast integration in Settings → General"
              : "Add one with the Quick Add command"
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Dondori"
                icon={Icon.AppWindow}
                onAction={() => openDeepLink("panel")}
              />
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        sections(tasks).map((section) => (
          <List.Section
            key={section.category}
            title={sectionTitle(section.category)}
            subtitle={`${section.tasks.length}`}
          >
            {section.tasks.map((task) => (
              <List.Item
                key={task.id}
                icon={statusIcon(task)}
                title={task.title}
                subtitle={task.identifier ?? undefined}
                accessories={accessories(task)}
                actions={
                  <ActionPanel>
                    <Action
                      title="Open in App"
                      icon={Icon.AppWindow}
                      onAction={() => openDeepLink("panel")}
                    />
                    <Action
                      title="Toggle Done"
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() =>
                        act("Toggle", () => toggleTask(task.id), "Task updated")
                      }
                    />
                    {task.timerRunning ? (
                      <Action
                        title="Stop Timer"
                        icon={Icon.Stop}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        onAction={() =>
                          act("Stop timer", () => stopTimer(), "Timer stopped")
                        }
                      />
                    ) : (
                      <Action
                        title="Start Timer"
                        icon={Icon.Play}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        onAction={() =>
                          act(
                            "Start timer",
                            () => startTimer(task.id),
                            "Timer started",
                          )
                        }
                      />
                    )}
                    <Action
                      title="Reload"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
