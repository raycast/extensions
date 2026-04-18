import { useEffect, useState } from "react";
import { useLocalStorage } from "@raycast/utils";
import { List, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { BASE_URL, DONE_CATEGORIES, Preferences, Task, Workspace, TaskItem } from "./shared";

type Me = { id: number; name: string };

// ── Bucket helpers (specific to Planned view) ─────────────────────────────────

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatBucketDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function bucketLabel(bucket: string): string {
  if (bucket === "overdue") return "Overdue";
  if (bucket === "today") return "Today";
  if (bucket === "tomorrow") return "Tomorrow";
  if (bucket === "no_due_date") return "No Due Date";
  return formatBucketDate(bucket);
}

function getTaskBucket(task: Task, todayStr: string, tomorrowStr: string): string {
  const dateStr = task.due_date
    ? String(task.due_date).substring(0, 10)
    : task.start_date
      ? String(task.start_date).substring(0, 10)
      : null;
  if (!dateStr) return "no_due_date";
  if (dateStr < todayStr) return "overdue";
  if (dateStr === todayStr) return "today";
  if (dateStr === tomorrowStr) return "tomorrow";
  return dateStr;
}

function sortBuckets(buckets: string[]): string[] {
  const ORDER = ["overdue", "today", "tomorrow"];
  return buckets.sort((a, b) => {
    if (a === "no_due_date") return 1;
    if (b === "no_due_date") return -1;
    const ai = ORDER.indexOf(a);
    const bi = ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
}

// ── Command ───────────────────────────────────────────────────────────────────

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
        const meRes = await fetch(`${BASE_URL}/me`, { headers: { Authorization: `Bearer ${apiKey}` } });
        if (!meRes.ok) throw new Error("Failed to fetch current user");
        const me: Me = await meRes.json();

        // 2. Get all workspaces
        const wsRes = await fetch(`${BASE_URL}/workspaces`, { headers: { Authorization: `Bearer ${apiKey}` } });
        if (!wsRes.ok) throw new Error("Failed to fetch workspaces");
        const workspaces: Workspace[] = await wsRes.json();
        setWorkspaces(workspaces);
        setSlugMap(new Map(workspaces.map((ws) => [ws.id, ws.slug])));

        // 3. Fetch all assigned tasks across every workspace (all pages)
        const allTasks: Task[] = [];
        await Promise.all(
          workspaces.map(async (ws) => {
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

        // 4. Keep only tasks that have a due or start date, sorted chronologically
        const planned = allTasks
          .filter((t) => t.due_date != null || t.start_date != null)
          .sort((a, b) => {
            const aDate = a.due_date ?? a.start_date!;
            const bDate = b.due_date ?? b.start_date!;
            return new Date(aDate).getTime() - new Date(bDate).getTime();
          });

        setTasks(planned);
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load planned tasks",
          message: err instanceof Error ? err.message : "Request failed",
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const today = new Date();
  const todayStr = toDateStr(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = toDateStr(tomorrow);

  const visibleTasks = tasks
    .filter((t) => selectedWorkspaceId === "all" || String(t.workspace_id) === selectedWorkspaceId)
    .filter((t) => (showCompleted ?? false) || !DONE_CATEGORIES.has(t.status?.category ?? ""));

  const bucketMap = new Map<string, Task[]>();
  for (const task of visibleTasks) {
    const bucket = getTaskBucket(task, todayStr, tomorrowStr);
    if (!bucketMap.has(bucket)) bucketMap.set(bucket, []);
    bucketMap.get(bucket)!.push(task);
  }

  const sortedBuckets = sortBuckets(Array.from(bucketMap.keys()));

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Planned"
      searchBarPlaceholder="Search planned tasks…"
      searchBarAccessory={
        <List.Dropdown tooltip="Workspace" onChange={setSelectedWorkspaceId}>
          <List.Dropdown.Item title="All Workspaces" value="all" />
          {workspaces.map((ws) => (
            <List.Dropdown.Item key={ws.id} title={ws.name} value={String(ws.id)} />
          ))}
        </List.Dropdown>
      }
    >
      {sortedBuckets.map((bucket) => {
        const bucketTasks = bucketMap.get(bucket)!;
        return (
          <List.Section key={bucket} title={bucketLabel(bucket)}>
            {bucketTasks.map((task) => (
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
