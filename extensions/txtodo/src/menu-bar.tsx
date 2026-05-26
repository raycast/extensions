import { Icon, LaunchType, LocalStorage, launchCommand, MenuBarExtra } from "@raycast/api";
import { useEffect, useState } from "react";
import { stripMetadataFromDescription, type Task } from "./domain/parser";
import { type DateSections, sectionsByDate } from "./domain/sections";
import type { GroupKey } from "./domain/sort";
import { type FileSnapshot, read } from "./io/todoFile";
import { getPreferences } from "./preferences";
import { prioritySquircle } from "./priority";

const UP_NEXT_CAP = 5;
const UNSCHEDULED_CAP = 5;
const MENU_ICON = Icon.CheckCircle;
const VISIBILITY_KEY = "menu-bar-visible";

type State =
  | { kind: "loading" }
  | { kind: "hidden" }
  | { kind: "ready"; snapshot: FileSnapshot }
  | { kind: "notfound" }
  | { kind: "error"; message: string };

export default function MenuBar() {
  const prefs = getPreferences();
  const [state, setState] = useState<State>({ kind: "loading" });

  async function load() {
    const visibility = await LocalStorage.getItem<string>(VISIBILITY_KEY);
    if (visibility === "false") {
      setState({ kind: "hidden" });
      return;
    }
    try {
      const result = await read(prefs.todoPath);
      setState(result === "notfound" ? { kind: "notfound" } : { kind: "ready", snapshot: result });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }

  useEffect(() => {
    void load();
  }, [prefs.todoPath]);

  if (state.kind === "hidden") return null;

  if (state.kind === "loading") {
    return <MenuBarExtra icon={MENU_ICON} isLoading />;
  }

  if (state.kind === "notfound") {
    return (
      <MenuBarExtra icon={MENU_ICON}>
        <MenuBarExtra.Item
          title="No todo.txt Found"
          subtitle="Open Show Tasks to create it"
          icon={Icon.ExclamationMark}
          onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  if (state.kind === "error") {
    return (
      <MenuBarExtra icon={MENU_ICON}>
        <MenuBarExtra.Item
          title="Couldn't Read todo.txt"
          subtitle={state.message}
          icon={Icon.ExclamationMark}
          onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra>
    );
  }

  const now = new Date();
  const active = state.snapshot.tasks.filter((t) => !t.completed);
  const sections = sectionsByDate(active, now);
  const title = menuBarTitle(sections, active.length);
  const upNextVisible = sections.upNext.slice(0, UP_NEXT_CAP);
  const upNextOverflow = sections.upNext.length - upNextVisible.length;
  const unscheduledVisible = sections.unscheduled.slice(0, UNSCHEDULED_CAP);
  const unscheduledOverflow = sections.unscheduled.length - unscheduledVisible.length;
  const isAllClear = active.length === 0;

  const renderItem = (task: Task) => {
    const key: GroupKey = task.priority ?? "none";
    return (
      <MenuBarExtra.Item
        key={`${task.lineNumber}-${task.raw}`}
        icon={prioritySquircle(key, false)}
        title={stripMetadataFromDescription(task.description)}
        tooltip={tooltipFor(task)}
        onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
      />
    );
  };

  return (
    <MenuBarExtra icon={MENU_ICON} title={title}>
      {isAllClear && <MenuBarExtra.Item title="All Clear" icon={Icon.CheckCircle} />}
      {sections.overdue.length > 0 && (
        <MenuBarExtra.Section title={sectionTitle("Overdue", sections.overdue.length)}>
          {sections.overdue.map(renderItem)}
        </MenuBarExtra.Section>
      )}
      {sections.today.length > 0 && (
        <MenuBarExtra.Section title={sectionTitle("Today", sections.today.length)}>
          {sections.today.map(renderItem)}
        </MenuBarExtra.Section>
      )}
      {sections.upNext.length > 0 && (
        <MenuBarExtra.Section title={sectionTitle("Up Next", sections.upNext.length)}>
          {upNextVisible.map(renderItem)}
          {upNextOverflow > 0 && (
            <MenuBarExtra.Item
              title={`+ ${upNextOverflow} more…`}
              icon={Icon.Ellipsis}
              onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
            />
          )}
        </MenuBarExtra.Section>
      )}
      {sections.unscheduled.length > 0 && (
        <MenuBarExtra.Section title={sectionTitle("Unscheduled", sections.unscheduled.length)}>
          {unscheduledVisible.map(renderItem)}
          {unscheduledOverflow > 0 && (
            <MenuBarExtra.Item
              title={`+ ${unscheduledOverflow} more…`}
              icon={Icon.Ellipsis}
              onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
            />
          )}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Add Task"
          icon={Icon.Plus}
          onAction={() => void launchCommand({ name: "quick-add", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Show Tasks"
          icon={Icon.List}
          onAction={() => void launchCommand({ name: "tasks", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Reload" icon={Icon.ArrowClockwise} onAction={() => void load()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function sectionTitle(label: string, count: number): string {
  return `${label} · ${count} task${count === 1 ? "" : "s"}`;
}

function menuBarTitle(sections: DateSections, totalActive: number): string {
  const overdue = sections.overdue.length;
  const today = sections.today.length;
  if (overdue > 0 && today > 0) return `${overdue} overdue · ${today} today`;
  if (overdue > 0) return `${overdue} overdue`;
  if (today > 0) return `${today} today`;
  if (totalActive > 0) return `${totalActive} active`;
  return "";
}

function tooltipFor(task: Task): string {
  const parts: string[] = [task.description];
  if (task.projects.length) parts.push(`Projects: ${task.projects.map((p) => `+${p}`).join(" ")}`);
  if (task.contexts.length) parts.push(`Contexts: ${task.contexts.map((c) => `@${c}`).join(" ")}`);
  return parts.join("\n");
}
