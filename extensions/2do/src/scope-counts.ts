import { hasStarted, scopeArgs, Task, twoDo } from "./2do";

type QueryPage = { tasks: Task[]; item_count: number; total_count: number };

// Dropdown label: "Today (2)". Omit the number while a count is still loading or failed.
export function titleWithCount(title: string, count?: number) {
  return count === undefined ? title : `${title} (${count})`;
}

async function queryPage(args: object, offset: number): Promise<QueryPage> {
  return twoDo<QueryPage>("query_tasks", { ...args, limit: 200, offset });
}

// Walk every page of a query (for counts that need client filters).
async function forEachTask(args: object, visit: (task: Task) => void) {
  let offset = 0;
  for (;;) {
    const page = await queryPage(args, offset);
    for (const task of page.tasks) visit(task);
    offset += page.item_count;
    if (page.item_count === 0 || offset >= page.total_count) break;
  }
}

// Most scopes: limit 1 and read total_count so the 200-task display cap does not apply.
export async function countScope(scope: string): Promise<number> {
  const { total_count } = await twoDo<{ total_count: number }>("query_tasks", {
    ...scopeArgs(scope),
    limit: 1,
  });
  return total_count;
}

// Now / Later Today share Today's query; totals need hasStarted over the full Today set.
export async function countNowAndLaterToday(now = new Date()): Promise<{ now: number; later: number }> {
  let started = 0;
  let later = 0;
  await forEachTask({ focus: "today", include_completed: false }, (task) => {
    if (hasStarted(task, now)) started++;
    else later++;
  });
  return { now: started, later };
}

// One paused-only walk covers every Paused: {tag} row.
export async function countPausedTags(tagIds: string[]): Promise<Record<string, number>> {
  const wanted = new Set(tagIds);
  const counts: Record<string, number> = Object.fromEntries(tagIds.map((id) => [id, 0]));
  await forEachTask({ focus: "all", include_completed: false, paused_filter: "only" }, (task) => {
    for (const tag of task.tags) {
      if (wanted.has(tag.tag_id)) counts[tag.tag_id]++;
    }
  });
  return counts;
}

// Background loader for every dropdown value. Failures leave that scope without a number.
export async function loadScopeCounts(scopes: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const simple: string[] = [];
  const pausedTagIds: string[] = [];
  let splitToday = false;

  for (const scope of scopes) {
    if (scope === "focus:now" || scope === "focus:later-today") splitToday = true;
    else if (scope.startsWith("paused-tag:")) pausedTagIds.push(scope.slice("paused-tag:".length));
    else simple.push(scope);
  }

  await Promise.all([
    ...simple.map(async (scope) => {
      try {
        counts[scope] = await countScope(scope);
      } catch {
        // Leave this scope unlabeled rather than blocking the rest.
      }
    }),
    (async () => {
      if (!splitToday) return;
      try {
        const { now, later } = await countNowAndLaterToday();
        counts["focus:now"] = now;
        counts["focus:later-today"] = later;
      } catch {
        // Same as simple scopes.
      }
    })(),
    (async () => {
      if (pausedTagIds.length === 0) return;
      try {
        const byTag = await countPausedTags(pausedTagIds);
        for (const id of pausedTagIds) counts[`paused-tag:${id}`] = byTag[id] ?? 0;
      } catch {
        // Same as simple scopes.
      }
    })(),
  ]);

  return counts;
}
