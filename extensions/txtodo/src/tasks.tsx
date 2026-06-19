import { writeFile as fsWriteFile } from "node:fs/promises";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  type LaunchProps,
  List,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";

const TAG_PROJECT_COLOR: Color.ColorLike = Color.Green;
const TAG_CONTEXT_COLOR: Color.ColorLike = Color.Magenta;

const DUE_OVERDUE_COLOR: Color.ColorLike = Color.Red;
const DUE_TODAY_COLOR: Color.ColorLike = Color.Blue;
const DUE_SOON_COLOR: Color.ColorLike = Color.Purple;
const DUE_FUTURE_COLOR: Color.ColorLike = Color.SecondaryText;

type GroupMode = "date" | "priority";
const GROUP_MODE_KEY = "tasks-group-mode";

import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { TaskForm } from "./components/TaskForm";
import { formatRelativeDue, parseDueDate } from "./domain/due";
import { type Priority, stripMetadataFromDescription, type Task } from "./domain/parser";
import { applyPreset, isValidPreset, type ViewPreset } from "./domain/preset";
import { type DateSections, sectionsByDate } from "./domain/sections";
import { type GroupKey, groupByPriority, PRIORITY_KEYS, sortGroup } from "./domain/sort";
import { matchesFilters, type TagFilter, tagFilterKey } from "./domain/tags";
import { complete, setPriority, uncomplete, withCreationDate } from "./domain/task";
import { appendToDone, type FileSnapshot, read, watch, writeAtomic } from "./io/todoFile";
import { getPreferences } from "./preferences";
import { priorityLabel, prioritySquircle } from "./priority";

type Status = { kind: "loading" } | { kind: "ready"; snapshot: FileSnapshot } | { kind: "notfound" };

type ArchiveStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; snapshot: FileSnapshot }
  | { kind: "notfound" }
  | { kind: "error"; message: string };

type Arguments = { preset?: string };

export default function Tasks(props: LaunchProps<{ arguments: Arguments }>) {
  const argPreset = props.arguments.preset;
  const initialPreset: ViewPreset = isValidPreset(argPreset) ? argPreset : "all";
  return <TasksView initialPreset={initialPreset} />;
}

export function TasksView({
  initialPreset = "all",
  initialView = "active",
}: {
  initialPreset?: ViewPreset;
  initialView?: "active" | "archived";
}) {
  const prefs = useMemo(getPreferences, []);

  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [preset, setPreset] = useState<ViewPreset>(initialPreset);
  // Raycast's List.Dropdown fires a spurious onChange with the first child's value
  // on mount, overwriting the controlled `value`. Swallow that one event so the
  // preset argument from the root search is honored.
  const skipNextDropdownChange = useRef(true);
  const [tagFilters, setTagFilters] = useState<TagFilter[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const toggleDetail = () => setShowDetail((v) => !v);
  const [groupMode, setGroupMode] = useState<GroupMode>("date");
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus>({ kind: "idle" });
  const viewMode: "active" | "archived" = initialView;

  function toggleTagFilter(f: TagFilter) {
    setTagFilters((prev) => {
      const idx = prev.findIndex((p) => tagFilterKey(p) === tagFilterKey(f));
      if (idx === -1) return [...prev, f];
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }

  function removeTagFilter(f: TagFilter) {
    setTagFilters((prev) => prev.filter((p) => tagFilterKey(p) !== tagFilterKey(f)));
  }

  function clearTagFilters() {
    setTagFilters([]);
  }

  const knownProjects = useMemo(
    () => [...new Set(status.kind === "ready" ? status.snapshot.tasks.flatMap((t) => t.projects) : [])],
    [status],
  );
  const knownContexts = useMemo(
    () => [...new Set(status.kind === "ready" ? status.snapshot.tasks.flatMap((t) => t.contexts) : [])],
    [status],
  );

  async function applyMutation(transform: (tasks: Task[]) => Task[], message: string) {
    if (status.kind !== "ready") return;
    const next = transform(status.snapshot.tasks);
    const result = await writeAtomic(status.snapshot, next);
    if (result.kind === "ok") {
      setStatus({ kind: "ready", snapshot: result.snapshot });
      await showToast({ style: Toast.Style.Success, title: message });
    } else {
      const retry = await writeAtomic(result.fresh, transform(result.fresh.tasks));
      if (retry.kind === "ok") {
        setStatus({ kind: "ready", snapshot: retry.snapshot });
        await showToast({
          style: Toast.Style.Success,
          title: `${message} (refreshed)`,
        });
      } else {
        setStatus({ kind: "ready", snapshot: retry.fresh });
        await showToast({
          style: Toast.Style.Failure,
          title: "todo.txt changed externally — refreshed",
        });
      }
    }
  }

  function applyTransformTo(task: Task, transform: (t: Task) => Task, message: string) {
    return applyMutation((tasks) => {
      const idx = tasks.findIndex((t) => t.raw === task.raw && t.lineNumber === task.lineNumber);
      if (idx === -1) return tasks;
      return [...tasks.slice(0, idx), transform(tasks[idx]), ...tasks.slice(idx + 1)];
    }, message);
  }

  function deleteTask(task: Task) {
    return applyMutation(
      (tasks) => tasks.filter((t) => !(t.raw === task.raw && t.lineNumber === task.lineNumber)),
      "Deleted",
    );
  }

  async function toggleComplete(task: Task) {
    if (status.kind !== "ready") return;
    const willComplete = !task.completed;

    if (willComplete && prefs.archiveOnComplete) {
      const toggled = complete(task, today());
      try {
        await appendToDone(prefs.donePath, [toggled]);
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't archive to done.txt",
          message: err instanceof Error ? err.message : String(err),
        });
        return;
      }
      setArchiveStatus({ kind: "idle" });
      await applyMutation(
        (tasks) => tasks.filter((t) => !(t.raw === task.raw && t.lineNumber === task.lineNumber)),
        "Completed and archived",
      );
      return;
    }

    await applyMutation(
      (tasks) => {
        const idx = tasks.findIndex((t) => t.raw === task.raw && t.lineNumber === task.lineNumber);
        if (idx === -1) return tasks;
        const target = tasks[idx];
        const toggled = target.completed ? uncomplete(target) : complete(target, today());
        return [...tasks.slice(0, idx), toggled, ...tasks.slice(idx + 1)];
      },
      willComplete ? "Completed" : "Marked incomplete",
    );
  }

  async function archiveCompleted() {
    if (status.kind !== "ready") return;
    const completedTasks = status.snapshot.tasks.filter((t) => t.completed);
    if (completedTasks.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to archive",
      });
      return;
    }
    try {
      await appendToDone(prefs.donePath, completedTasks);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't archive to done.txt",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }
    await applyMutation(
      (tasks) => tasks.filter((t) => !t.completed),
      `Archived ${completedTasks.length} task${completedTasks.length === 1 ? "" : "s"}`,
    );
    setArchiveStatus({ kind: "idle" });
  }

  async function unarchive(task: Task) {
    if (status.kind !== "ready") return;
    if (archiveStatus.kind !== "ready") return;

    const truncated = task.description.length > 40 ? `${task.description.slice(0, 40)}…` : task.description;

    // --- Write 1: append to todo.txt, retry once on conflict.
    let activeAfter = status.snapshot;
    {
      const next = [...status.snapshot.tasks, { ...task, lineNumber: status.snapshot.tasks.length }];
      const first = await writeAtomic(status.snapshot, next);
      if (first.kind === "ok") {
        activeAfter = first.snapshot;
      } else {
        const retryNext = [...first.fresh.tasks, { ...task, lineNumber: first.fresh.tasks.length }];
        const retry = await writeAtomic(first.fresh, retryNext);
        if (retry.kind !== "ok") {
          setStatus({ kind: "ready", snapshot: retry.fresh });
          await showToast({
            style: Toast.Style.Failure,
            title: "Couldn't unarchive — todo.txt changed, try again",
          });
          return;
        }
        activeAfter = retry.snapshot;
      }
    }
    setStatus({ kind: "ready", snapshot: activeAfter });

    // --- Write 2: remove from done.txt, retry once on conflict.
    const removeMatch = (t: Task) => !(t.raw === task.raw && t.lineNumber === task.lineNumber);
    let archiveAfter = archiveStatus.snapshot;
    {
      const next = archiveStatus.snapshot.tasks.filter(removeMatch);
      const first = await writeAtomic(archiveStatus.snapshot, next);
      if (first.kind === "ok") {
        archiveAfter = first.snapshot;
      } else {
        const freshHasIt = first.fresh.tasks.some((t) => t.raw === task.raw && t.lineNumber === task.lineNumber);
        if (!freshHasIt) {
          archiveAfter = first.fresh;
        } else {
          const retryNext = first.fresh.tasks.filter(removeMatch);
          const retry = await writeAtomic(first.fresh, retryNext);
          if (retry.kind !== "ok") {
            setArchiveStatus({ kind: "ready", snapshot: retry.fresh });
            await showToast({
              style: Toast.Style.Failure,
              title: "Unarchived, but done.txt couldn't be updated — task may appear twice",
            });
            return;
          }
          archiveAfter = retry.snapshot;
        }
      }
    }
    setArchiveStatus({ kind: "ready", snapshot: archiveAfter });

    await showToast({
      style: Toast.Style.Success,
      title: `Unarchived "${truncated}"`,
    });
  }

  async function reload() {
    const result = await read(prefs.todoPath);
    setStatus(result === "notfound" ? { kind: "notfound" } : { kind: "ready", snapshot: result });
  }

  function openEdit(task: Task) {
    return (
      <TaskForm
        mode="edit"
        initialTask={task}
        knownProjects={knownProjects}
        knownContexts={knownContexts}
        onSubmit={async (updated) => {
          await applyMutation((tasks) => {
            const idx = tasks.findIndex((t) => t.raw === task.raw && t.lineNumber === task.lineNumber);
            if (idx === -1) return tasks;
            const withLineNumber = { ...updated, lineNumber: task.lineNumber };
            return [...tasks.slice(0, idx), withLineNumber, ...tasks.slice(idx + 1)];
          }, "Updated");
        }}
      />
    );
  }

  function openNew() {
    return (
      <TaskForm
        mode="new"
        knownProjects={knownProjects}
        knownContexts={knownContexts}
        onSubmit={async (built) => {
          await applyMutation((tasks) => {
            const stamped =
              prefs.autoStampCreationDate && !built.creationDate ? withCreationDate(built, today()) : built;
            const withLine = { ...stamped, lineNumber: tasks.length };
            return [...tasks, withLine];
          }, "Added");
        }}
      />
    );
  }

  useEffect(() => {
    void LocalStorage.getItem<string>(GROUP_MODE_KEY).then((v) => {
      if (v === "priority" || v === "date") setGroupMode(v);
    });
  }, []);

  const toggleGroupMode = () => {
    const next: GroupMode = groupMode === "date" ? "priority" : "date";
    setGroupMode(next);
    void LocalStorage.setItem(GROUP_MODE_KEY, next);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result = await read(prefs.todoPath);
        if (cancelled) return;
        setStatus(result === "notfound" ? { kind: "notfound" } : { kind: "ready", snapshot: result });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        await showToast({
          style: Toast.Style.Failure,
          title: `Couldn't read ${prefs.todoPath}`,
          message,
          primaryAction: {
            title: "Open Preferences",
            onAction: () => openExtensionPreferences(),
          },
        });
      }
    };
    void load();

    let dispose: (() => void) | undefined;
    void (async () => {
      try {
        dispose = watch(prefs.todoPath, () => {
          if (!cancelled) void load();
        });
      } catch {
        // File doesn't exist yet — no watcher. Will retry on next interaction.
      }
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [prefs.todoPath]);

  useEffect(() => {
    if (viewMode !== "archived") return;
    if (archiveStatus.kind !== "idle") return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await read(prefs.donePath);
        if (cancelled) return;
        setArchiveStatus(result === "notfound" ? { kind: "notfound" } : { kind: "ready", snapshot: result });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setArchiveStatus({ kind: "error", message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewMode, archiveStatus.kind, prefs.donePath]);

  if (viewMode === "archived") {
    if (archiveStatus.kind === "loading" || archiveStatus.kind === "idle") {
      return <List isLoading searchBarPlaceholder="Loading archive…" />;
    }

    if (archiveStatus.kind === "error") {
      return (
        <List searchBarPlaceholder="Search archived tasks">
          <List.EmptyView
            title="Couldn't Read done.txt"
            description={archiveStatus.message}
            icon={Icon.ExclamationMark}
            actions={
              <ActionPanel>
                <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List>
      );
    }

    if (archiveStatus.kind === "notfound" || archiveStatus.snapshot.tasks.length === 0) {
      return (
        <List searchBarPlaceholder="Search archived tasks">
          <List.EmptyView
            title="No Archived Tasks"
            description="Completed tasks land here when you run Archive Completed."
            icon={Icon.Box}
          />
        </List>
      );
    }

    const archivedVisible = archiveStatus.snapshot.tasks
      .filter((t) => matchesFilters(t, tagFilters))
      .sort(compareArchived);

    return (
      <List searchBarPlaceholder="Search archived tasks">
        {archivedVisible.length === 0 ? (
          <List.EmptyView
            title="No Archived Tasks Match"
            description="Clear tag filters to see all archived tasks."
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action title="Clear Tag Filters" icon={Icon.Trash} onAction={clearTagFilters} />
              </ActionPanel>
            }
          />
        ) : (
          <List.Section
            title="Archived"
            subtitle={`${archivedVisible.length} task${archivedVisible.length === 1 ? "" : "s"}`}
          >
            {archivedVisible.map((task) => (
              <ArchivedTaskItem
                key={`arch-${task.lineNumber}-${task.raw}`}
                task={task}
                onUnarchive={() => unarchive(task)}
                prefs={prefs}
              />
            ))}
          </List.Section>
        )}
      </List>
    );
  }

  if (status.kind === "loading") return <List isLoading searchBarPlaceholder="Loading..." />;

  if (status.kind === "notfound") {
    return (
      <List searchBarPlaceholder="todo.txt not found">
        <List.EmptyView
          title="No todo.txt Found"
          description={`Expected at ${prefs.todoPath}`}
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action
                title={`Create ${prefs.todoPath}`}
                icon={Icon.NewDocument}
                onAction={async () => {
                  try {
                    await fsWriteFile(prefs.todoPath, "", "utf8");
                    const result = await read(prefs.todoPath);
                    if (result !== "notfound") setStatus({ kind: "ready", snapshot: result });
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: `Couldn't create ${prefs.todoPath}`,
                      message: err instanceof Error ? err.message : String(err),
                      primaryAction: {
                        title: "Open Preferences",
                        onAction: () => openExtensionPreferences(),
                      },
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const visible = applyPreset(status.snapshot.tasks, preset, new Date()).filter((t) => matchesFilters(t, tagFilters));
  const groups = groupMode === "priority" ? groupByPriority(visible) : null;
  const dateSections: DateSections | null = groupMode === "date" ? sectionsByDate(visible, new Date()) : null;

  function renderDateSections(sections: DateSections): ReactElement[] {
    const out: ReactElement[] = [];
    const buckets: Array<{ title: string; tasks: Task[] }> = [
      { title: "Overdue", tasks: sections.overdue },
      { title: "Today", tasks: sections.today },
      { title: "Up next", tasks: sections.upNext },
      { title: "Unscheduled", tasks: sections.unscheduled },
    ];
    for (const { title, tasks } of buckets) {
      if (tasks.length === 0) continue;
      out.push(
        <List.Section key={title} title={title} subtitle={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`}>
          {tasks.map((task) => {
            const key: GroupKey = task.priority ?? "none";
            return (
              <TaskItem
                key={`date-${title}-${task.lineNumber}-${task.raw}`}
                task={task}
                groupKey={key}
                onToggle={() => toggleComplete(task)}
                onEdit={() => openEdit(task)}
                onSetPriority={(p) =>
                  applyTransformTo(task, (t) => setPriority(t, p), p ? `Set Priority ${p}` : "Cleared priority")
                }
                onDelete={() => deleteTask(task)}
                onArchiveCompleted={archiveCompleted}
                prefs={prefs}
                onReload={reload}
                onToggleTagFilter={toggleTagFilter}
                activeTagFilters={tagFilters}
                allKnownProjects={knownProjects}
                allKnownContexts={knownContexts}
                showDetail={showDetail}
                onToggleDetail={toggleDetail}
                groupMode={groupMode}
                onToggleGroupMode={toggleGroupMode}
              />
            );
          })}
        </List.Section>,
      );
    }
    return out;
  }

  if (status.snapshot.tasks.length === 0) {
    return (
      <List searchBarPlaceholder="No tasks yet">
        <List.EmptyView
          title="No Tasks Yet"
          description="Press ⌘N to add one"
          icon={Icon.CheckCircle}
          actions={
            <ActionPanel>
              <Action.Push
                title="New Task"
                icon={Icon.Plus}
                target={openNew()}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isShowingDetail={showDetail}
      searchBarPlaceholder="Filter tasks (try @phone or +health)"
      searchBarAccessory={
        preset === "completed" ? undefined : (
          <List.Dropdown
            tooltip="View"
            value={preset}
            onChange={(v) => {
              if (skipNextDropdownChange.current) {
                skipNextDropdownChange.current = false;
                return;
              }
              setPreset(v as ViewPreset);
            }}
          >
            <List.Dropdown.Item title="Active" value="all" />
            <List.Dropdown.Item title="Today" value="today" />
            <List.Dropdown.Item title="This Week" value="this-week" />
            <List.Dropdown.Item title="Overdue" value="overdue" />
          </List.Dropdown>
        )
      }
    >
      {tagFilters.length > 0 && (
        <List.Section title="Active Filters" subtitle={`${tagFilters.length} active`}>
          {tagFilters.map((f) => {
            const label = f.kind === "project" ? `+${f.name}` : `@${f.name}`;
            return (
              <List.Item
                key={tagFilterKey(f)}
                title={label}
                icon={{ source: Icon.Filter, tintColor: Color.SecondaryText }}
                detail={
                  <List.Item.Detail
                    markdown={`## ${label}\n\nActive filter. Press **Enter** to remove, or **⌘⇧F** to clear all filters.`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action title="Remove Filter" onAction={() => removeTagFilter(f)} />
                    <Action
                      title="Clear All Filters"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                      onAction={clearTagFilters}
                    />
                    <Action
                      title={showDetail ? "Hide Detail" : "Show Detail"}
                      icon={Icon.AppWindowSidebarRight}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={toggleDetail}
                    />
                    <Action
                      title={groupMode === "date" ? "Group by Priority" : "Group by Date"}
                      icon={groupMode === "date" ? Icon.Star : Icon.Calendar}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
                      onAction={toggleGroupMode}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {visible.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={`No Tasks in ${presetLabel(preset)}`}
          description="Switch presets or clear filters."
          actions={
            <ActionPanel>
              <Action title="Show Active" icon={Icon.List} onAction={() => setPreset("all")} />
              {tagFilters.length > 0 && (
                <Action title="Clear Tag Filters" icon={Icon.Trash} onAction={clearTagFilters} />
              )}
            </ActionPanel>
          }
        />
      )}
      {groupMode === "priority" &&
        groups &&
        PRIORITY_KEYS.flatMap((key) => {
          const bucket = groups.get(key);
          if (!bucket || bucket.length === 0) return [];
          const sorted = sortGroup(bucket);
          return [
            <List.Section
              key={key}
              title={priorityLabel(key)}
              subtitle={`${sorted.length} task${sorted.length === 1 ? "" : "s"}`}
            >
              {sorted.map((task) => (
                <TaskItem
                  key={`${key}-${task.lineNumber}`}
                  task={task}
                  groupKey={key}
                  onToggle={() => toggleComplete(task)}
                  onEdit={() => openEdit(task)}
                  onSetPriority={(p) =>
                    applyTransformTo(task, (t) => setPriority(t, p), p ? `Set Priority ${p}` : "Cleared priority")
                  }
                  onDelete={() => deleteTask(task)}
                  onArchiveCompleted={archiveCompleted}
                  prefs={prefs}
                  onReload={reload}
                  onToggleTagFilter={toggleTagFilter}
                  activeTagFilters={tagFilters}
                  allKnownProjects={knownProjects}
                  allKnownContexts={knownContexts}
                  showDetail={showDetail}
                  onToggleDetail={toggleDetail}
                  groupMode={groupMode}
                  onToggleGroupMode={toggleGroupMode}
                />
              ))}
            </List.Section>,
          ];
        })}
      {groupMode === "date" && dateSections && renderDateSections(dateSections)}
    </List>
  );
}

function TaskItem({
  task,
  groupKey,
  onToggle,
  onEdit,
  onSetPriority,
  onDelete,
  onArchiveCompleted,
  prefs,
  onReload,
  onToggleTagFilter,
  activeTagFilters,
  allKnownProjects,
  allKnownContexts,
  showDetail,
  onToggleDetail,
  groupMode,
  onToggleGroupMode,
}: {
  task: Task;
  groupKey: GroupKey;
  onToggle: () => Promise<void>;
  onEdit: () => ReactElement;
  onSetPriority: (prio: Priority | undefined) => Promise<void>;
  onDelete: () => Promise<void>;
  onArchiveCompleted: () => Promise<void>;
  prefs: Preferences;
  onReload: () => Promise<void>;
  onToggleTagFilter: (f: TagFilter) => void;
  activeTagFilters: TagFilter[];
  allKnownProjects: string[];
  allKnownContexts: string[];
  showDetail: boolean;
  onToggleDetail: () => void;
  groupMode: GroupMode;
  onToggleGroupMode: () => void;
}) {
  const titlePrefix = task.completed ? "✓ " : "";
  const dueDate = parseDueDate(task.metadata.due);
  const dueLabel = formatRelativeDue(task.metadata.due, new Date());
  const accessories = dueDate
    ? [
        {
          tag: { value: dueLabel, color: dueChipColor(dueDate) },
          icon: Icon.Calendar,
          tooltip: `Due ${task.metadata.due}`,
        },
      ]
    : [];
  const keywords = [
    ...task.projects,
    ...task.contexts,
    ...task.projects.map((p) => `+${p}`),
    ...task.contexts.map((c) => `@${c}`),
  ];
  return (
    <List.Item
      title={`${titlePrefix}${stripMetadataFromDescription(task.description)}`}
      icon={prioritySquircle(groupKey, task.completed)}
      keywords={keywords}
      accessories={showDetail ? undefined : accessories}
      detail={<TaskDetail task={task} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={task.completed ? "Mark Incomplete" : "Complete Task"}
              icon={task.completed ? Icon.Circle : Icon.CheckCircle}
              onAction={onToggle}
            />
            <Action.Push
              title="Edit Raw"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={onEdit()}
            />
            <ActionPanel.Submenu title="Set Priority" icon={Icon.Star} shortcut={{ modifiers: ["cmd"], key: "p" }}>
              {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
                <Action key={letter} title={letter} onAction={() => onSetPriority(letter as Priority)} />
              ))}
              <Action title="Clear Priority" onAction={() => onSetPriority(undefined)} />
            </ActionPanel.Submenu>
            <Action
              title="Archive Completed"
              icon={Icon.Box}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={onArchiveCompleted}
            />
            <Action
              title="Delete Task"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={onDelete}
            />
          </ActionPanel.Section>

          {(task.projects.length > 0 ||
            task.contexts.length > 0 ||
            allKnownProjects.length > 0 ||
            allKnownContexts.length > 0) && (
            <ActionPanel.Section>
              {(task.projects.length > 0 || task.contexts.length > 0) && (
                <ActionPanel.Submenu
                  title="Filter by Tag"
                  icon={Icon.Filter}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                >
                  {task.projects.map((p) => {
                    const f: TagFilter = { kind: "project", name: p };
                    const active = activeTagFilters.some((a) => tagFilterKey(a) === tagFilterKey(f));
                    return (
                      <Action
                        key={`p-${p}`}
                        title={active ? `Remove +${p}` : `Add +${p}`}
                        onAction={() => onToggleTagFilter(f)}
                      />
                    );
                  })}
                  {task.contexts.map((c) => {
                    const f: TagFilter = { kind: "context", name: c };
                    const active = activeTagFilters.some((a) => tagFilterKey(a) === tagFilterKey(f));
                    return (
                      <Action
                        key={`c-${c}`}
                        title={active ? `Remove @${c}` : `Add @${c}`}
                        onAction={() => onToggleTagFilter(f)}
                      />
                    );
                  })}
                </ActionPanel.Submenu>
              )}
              {(allKnownProjects.length > 0 || allKnownContexts.length > 0) && (
                <ActionPanel.Submenu
                  title="Add Filter"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                >
                  {allKnownProjects.map((p) => {
                    const f: TagFilter = { kind: "project", name: p };
                    const active = activeTagFilters.some((a) => tagFilterKey(a) === tagFilterKey(f));
                    if (active) return null;
                    return <Action key={`gp-${p}`} title={`+${p}`} onAction={() => onToggleTagFilter(f)} />;
                  })}
                  {allKnownContexts.map((c) => {
                    const f: TagFilter = { kind: "context", name: c };
                    const active = activeTagFilters.some((a) => tagFilterKey(a) === tagFilterKey(f));
                    if (active) return null;
                    return <Action key={`gc-${c}`} title={`@${c}`} onAction={() => onToggleTagFilter(f)} />;
                  })}
                </ActionPanel.Submenu>
              )}
            </ActionPanel.Section>
          )}

          <ActionPanel.Section>
            <Action.Open title="Open Todo.txt" target={prefs.todoPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
            <Action
              title="Reload"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onReload}
            />
            <Action
              title={showDetail ? "Hide Detail" : "Show Detail"}
              icon={Icon.AppWindowSidebarRight}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={onToggleDetail}
            />
            <Action
              title={groupMode === "date" ? "Group by Priority" : "Group by Date"}
              icon={groupMode === "date" ? Icon.Star : Icon.Calendar}
              shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
              onAction={onToggleGroupMode}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ArchivedTaskItem({
  task,
  onUnarchive,
  prefs,
}: {
  task: Task;
  onUnarchive: () => Promise<void>;
  prefs: Preferences;
}) {
  return (
    <List.Item
      title={`✓ ${stripMetadataFromDescription(task.description)}`}
      keywords={[
        ...task.projects,
        ...task.contexts,
        ...task.projects.map((p) => `+${p}`),
        ...task.contexts.map((c) => `@${c}`),
      ]}
      accessories={task.completionDate ? [{ tag: { value: task.completionDate, color: Color.SecondaryText } }] : []}
      actions={
        <ActionPanel>
          <Action title="Unarchive" icon={Icon.ArrowCounterClockwise} onAction={onUnarchive} />
          <Action.Open title="Open Done.txt" target={prefs.donePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function TaskDetail({ task }: { task: Task }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Priority" text={task.priority ? `(${task.priority})` : "—"} />
          <List.Item.Detail.Metadata.Label title="Created" text={task.creationDate || "—"} />
          {task.completed && task.completionDate && (
            <List.Item.Detail.Metadata.Label title="Completed" text={task.completionDate} />
          )}
          {task.metadata.due && <List.Item.Detail.Metadata.Label title="Due" text={task.metadata.due} />}
          <List.Item.Detail.Metadata.TagList title="Projects">
            {task.projects.length > 0 ? (
              task.projects.map((p) => (
                <List.Item.Detail.Metadata.TagList.Item key={p} text={`+${p}`} color={TAG_PROJECT_COLOR} />
              ))
            ) : (
              <List.Item.Detail.Metadata.TagList.Item text="—" />
            )}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Contexts">
            {task.contexts.length > 0 ? (
              task.contexts.map((c) => (
                <List.Item.Detail.Metadata.TagList.Item key={c} text={`@${c}`} color={TAG_CONTEXT_COLOR} />
              ))
            ) : (
              <List.Item.Detail.Metadata.TagList.Item text="—" />
            )}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

const PRESET_LABELS: Record<ViewPreset, string> = {
  all: "Active",
  today: "Today",
  "this-week": "This Week",
  overdue: "Overdue",
  completed: "Completed",
};

function presetLabel(preset: ViewPreset): string {
  return PRESET_LABELS[preset];
}

function dueChipColor(due: Date): Color.ColorLike {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfDay(due).getTime() - startOfDay(new Date()).getTime()) / 86400000);
  if (diffDays < 0) return DUE_OVERDUE_COLOR;
  if (diffDays === 0) return DUE_TODAY_COLOR;
  if (diffDays <= 2) return DUE_SOON_COLOR;
  return DUE_FUTURE_COLOR;
}

function today(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function compareArchived(a: Task, b: Task): number {
  const aDate = a.completionDate ?? "";
  const bDate = b.completionDate ?? "";
  if (aDate !== bDate) return aDate < bDate ? 1 : -1; // desc
  return a.lineNumber - b.lineNumber;
}
