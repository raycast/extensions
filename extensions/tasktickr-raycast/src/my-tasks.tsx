import { Icon, List, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { api } from "./lib/api";
import type { Priority, Task, UserSettings, Workspace } from "./lib/types";
import { TaskItem } from "./components/task-item";

const PRIORITY_ORDER: Record<Priority, number> = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

// Autosort: order open top-level tasks by due date (soonest first; no due
// date sinks to the bottom), then priority (HIGH before LOW within the same
// due date), then age (oldest first), then estimated duration (quick wins
// first; no estimate sinks to the bottom). Indexes are assigned globally.
// Returns the changed tasks as { id, sortOrder } so callers persist the minimum.
function computeAutosort(tasks: Task[]): { id: string; sortOrder: number }[] {
  const changes: { id: string; sortOrder: number }[] = [];
  const age = (t: Task) => new Date(t.createdAt).getTime();
  const dur = (t: Task) => t.durationMinutes ?? Infinity;
  const due = (t: Task) =>
    t.dueDate ? new Date(t.dueDate).getTime() : Infinity;
  const prio = (t: Task) => PRIORITY_ORDER[t.priority ?? "MEDIUM"];
  const open = tasks
    .filter((t) => t.status !== "DONE" && t.parentId == null)
    .sort(
      (a, b) =>
        due(a) - due(b) ||
        prio(a) - prio(b) ||
        age(a) - age(b) ||
        dur(a) - dur(b),
    );
  open.forEach((task, i) => {
    if ((task.sortOrder ?? 0) !== i)
      changes.push({ id: task.id, sortOrder: i });
  });
  return changes;
}

export default function MyTasks() {
  const [searchText, setSearchText] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");

  const { data: workspaces } = useCachedPromise(
    () => api<Workspace[]>("/api/workspaces"),
    [],
    { initialData: [] },
  );
  const { data: settings } = useCachedPromise(
    () => api<UserSettings>("/api/settings"),
    [],
  );

  const {
    data: tasks,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (query: string, ws: string) => {
      if (query.trim()) {
        const params = new URLSearchParams({ q: query.trim(), limit: "30" });
        if (ws) params.set("workspaceId", ws);
        return api<Task[]>(`/api/search?${params}`);
      }
      const params = new URLSearchParams({ parentId: "null" });
      if (ws) params.set("workspaceId", ws);
      return api<Task[]>(`/api/tasks?${params}`);
    },
    [searchText, workspaceId],
    { initialData: [], keepPreviousData: true },
  );

  const searching = searchText.trim().length > 0;
  const presets = settings?.postponePresets ?? null;

  const open = (tasks ?? []).filter((t) => t.status !== "DONE");
  const due = open
    .filter((t) => t.dueDate != null)
    .sort(
      (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
    );
  const byPriority = open
    .filter((t) => t.dueDate == null)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const done = (tasks ?? []).filter((t) => t.status === "DONE");

  async function autosort() {
    // Always compute over ALL workspaces — sorting a filtered subset would
    // assign per-workspace 0..n indexes that interleave wrongly in the all view.
    const all = await api<Task[]>(
      `/api/tasks?${new URLSearchParams({ parentId: "null" })}`,
    );
    const changes = computeAutosort(all);
    if (!changes.length) {
      await showToast({ style: Toast.Style.Success, title: "Already sorted" });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Auto-sorting…",
    });
    try {
      await Promise.all(
        changes.map(({ id, sortOrder }) =>
          api(`/api/tasks/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ sortOrder }),
          }),
        ),
      );
      toast.style = Toast.Style.Success;
      toast.title = `Sorted ${changes.length} task${changes.length === 1 ? "" : "s"}`;
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Auto-sort failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  const item = (t: Task) => (
    <TaskItem
      key={t.id}
      task={t}
      workspaces={workspaces}
      postponePresets={presets}
      revalidate={revalidate}
      onAutosort={autosort}
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tasks…"
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Workspace"
          value={workspaceId}
          onChange={setWorkspaceId}
        >
          <List.Dropdown.Item
            value=""
            title="All Workspaces"
            icon={Icon.Globe}
          />
          {workspaces.map((w) => (
            <List.Dropdown.Item
              key={w.id}
              value={w.id}
              title={w.name}
              icon={Icon.Folder}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={searching ? "No Matching Tasks" : "All Clear"}
        description={
          searching
            ? "Try a different search."
            : "No tasks here — enjoy the quiet."
        }
        icon={searching ? Icon.MagnifyingGlass : Icon.CheckRosette}
      />
      {searching ? (
        <List.Section title="Results" subtitle={String((tasks ?? []).length)}>
          {(tasks ?? []).map(item)}
        </List.Section>
      ) : (
        <>
          <List.Section title="Due" subtitle={String(due.length)}>
            {due.map(item)}
          </List.Section>
          <List.Section title="Priority" subtitle={String(byPriority.length)}>
            {byPriority.map(item)}
          </List.Section>
          <List.Section title="Done" subtitle={String(done.length)}>
            {done.map(item)}
          </List.Section>
        </>
      )}
    </List>
  );
}
