import { useEffect, useState } from "react";
import { useLocalStorage } from "@raycast/utils";
import { List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { BASE_URL, DONE_CATEGORIES, Preferences, Task, Workspace, TaskItem } from "./shared";

type Me = { id: number; name: string };

const PRIORITY_ORDER = ["urgent", "high", "medium", "low", "none"] as const;
const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
};

export default function Command() {
  const { apiKey, showCompletedTasks } = getPreferenceValues<Preferences>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [slugMap, setSlugMap] = useState<Map<number, string>>(new Map());
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("all");
  const { value: showCompleted, setValue: setShowCompleted } = useLocalStorage("showCompleted", showCompletedTasks);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // 1. Get current user
        const meRes = await fetch(`${BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!meRes.ok) throw new Error("Failed to fetch current user");
        const me: Me = await meRes.json();

        // 2. Get all workspaces
        const wsRes = await fetch(`${BASE_URL}/workspaces`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!wsRes.ok) throw new Error("Failed to fetch workspaces");
        const loadedWorkspaces: Workspace[] = await wsRes.json();
        setWorkspaces(loadedWorkspaces);
        setSlugMap(new Map(loadedWorkspaces.map((ws) => [ws.id, ws.slug])));

        // 3. For each workspace, fetch tasks assigned to me (all pages)
        const allTasks: Task[] = [];
        await Promise.all(
          loadedWorkspaces.map(async (ws) => {
            let page = 1;
            while (true) {
              const res = await fetch(
                `${BASE_URL}/workspaces/${ws.id}/tasks?assignee_id=${me.id}&limit=100&page=${page}`,
                { headers: { Authorization: `Bearer ${apiKey}` } },
              );
              if (!res.ok) break;
              const data = await res.json();
              const items: Task[] = data.data || [];
              allTasks.push(...items);
              if (page >= (data.total_pages ?? 1)) break;
              page++;
            }
          }),
        );

        // Sort: incomplete first, then by due date within each priority group
        allTasks.sort((a, b) => {
          const aDone = DONE_CATEGORIES.has(a.status?.category ?? "") ? 1 : 0;
          const bDone = DONE_CATEGORIES.has(b.status?.category ?? "") ? 1 : 0;
          if (aDone !== bDone) return aDone - bDone;
          if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          if (a.due_date) return -1;
          if (b.due_date) return 1;
          return 0;
        });

        setTasks(allTasks);
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load tasks",
          message: err instanceof Error ? err.message : "Request failed",
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const visibleTasks = tasks
    .filter((t) => selectedWorkspaceId === "all" || String(t.workspace_id) === selectedWorkspaceId)
    .filter((t) => (showCompleted ?? false) || !DONE_CATEGORIES.has(t.status?.category ?? ""));

  const grouped = PRIORITY_ORDER.reduce(
    (acc, p) => {
      acc[p] = visibleTasks.filter((t) => (t.priority || "none") === p);
      return acc;
    },
    {} as Record<string, Task[]>,
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="My Tasks"
      searchBarPlaceholder="Search tasks…"
      searchBarAccessory={
        <List.Dropdown tooltip="Workspace" onChange={setSelectedWorkspaceId}>
          <List.Dropdown.Item title="All Workspaces" value="all" />
          {workspaces.map((ws) => (
            <List.Dropdown.Item key={ws.id} title={ws.name} value={String(ws.id)} />
          ))}
        </List.Dropdown>
      }
    >
      {PRIORITY_ORDER.map((priority) => {
        const group = grouped[priority];
        if (!group.length) return null;
        return (
          <List.Section key={priority} title={PRIORITY_LABELS[priority]}>
            {group.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                slugMap={slugMap}
                apiKey={apiKey}
                showCompleted={showCompleted ?? false}
                onToggleCompleted={() => setShowCompleted(!(showCompleted ?? false))}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
