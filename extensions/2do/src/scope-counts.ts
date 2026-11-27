import { hasStarted, scopeArgs, Task, toDate, twoDo } from "./2do";

type QueryPage = { tasks: Task[]; item_count: number; total_count: number };

export type ScopeCounts = {
  counts: Record<string, number>;
  // Earliest Later Today start still ahead; used to refresh Now / Later when it passes.
  nextStart?: Date;
};

const COUNT_CONCURRENCY = 4;
export const DISPLAY_LIMIT = 200;

// Dropdown label: "Today (2)". Omit the number while a count is still loading or failed.
export function titleWithCount(title: string, count?: number) {
  return count === undefined ? title : `${title} (${count})`;
}

async function queryPage(args: object, offset: number, limit = DISPLAY_LIMIT): Promise<QueryPage> {
  return twoDo<QueryPage>("query_tasks", { ...args, limit, offset });
}

// Run at most `concurrency` async jobs at once.
export async function mapPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]);
    }
  }
  const n = Math.min(concurrency, items.length);
  if (n === 0) return;
  await Promise.all(Array.from({ length: n }, () => worker()));
}

// Walk pages, keeping tasks that match, until `limit` matches or the source is exhausted.
export async function collectMatchingTasks(
  args: object,
  match: (task: Task) => boolean,
  limit = DISPLAY_LIMIT,
): Promise<Task[]> {
  const out: Task[] = [];
  let offset = 0;
  for (;;) {
    const page = await queryPage(args, offset);
    for (const task of page.tasks) {
      if (!match(task)) continue;
      out.push(task);
      if (out.length >= limit) return out;
    }
    offset += page.item_count;
    if (page.item_count === 0 || offset >= page.total_count) break;
  }
  return out;
}

// Walk every page of a query (for counts that need the full set).
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
export async function countNowAndLaterToday(
  now = new Date(),
): Promise<{ now: number; later: number; nextStart?: Date }> {
  let started = 0;
  let later = 0;
  let nextStart: Date | undefined;
  await forEachTask({ focus: "today", include_completed: false }, (task) => {
    if (hasStarted(task, now)) {
      started++;
      return;
    }
    later++;
    const start = toDate(task.start_date, task.start_time);
    if (start && (!nextStart || start < nextStart)) nextStart = start;
  });
  return { now: started, later, nextStart };
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

// Client-filtered scopes walk the source until the display limit is filled with matches.
export function scopeMatch(scope: string, now = new Date()): ((task: Task) => boolean) | undefined {
  if (scope === "focus:now") return (t) => hasStarted(t, now);
  if (scope === "focus:later-today") return (t) => !hasStarted(t, now);
  if (scope.startsWith("paused-tag:")) {
    const tagId = scope.slice("paused-tag:".length);
    return (t) => t.tags.some((tag) => tag.tag_id === tagId);
  }
}

export async function loadScopeTasks(scope: string, now = new Date()): Promise<Task[]> {
  const args = scopeArgs(scope);
  const match = scopeMatch(scope, now);
  if (match) return collectMatchingTasks(args, match, DISPLAY_LIMIT);
  const { tasks } = await twoDo<{ tasks: Task[] }>("query_tasks", { ...args, limit: DISPLAY_LIMIT });
  return tasks;
}

// Background loader for every dropdown value. Failures leave that scope without a number.
export async function loadScopeCounts(scopes: string[], now = new Date()): Promise<ScopeCounts> {
  const counts: Record<string, number> = {};
  const simple: string[] = [];
  const pausedTagIds: string[] = [];
  let splitToday = false;
  let nextStart: Date | undefined;

  for (const scope of scopes) {
    if (scope === "focus:now" || scope === "focus:later-today") splitToday = true;
    else if (scope.startsWith("paused-tag:")) pausedTagIds.push(scope.slice("paused-tag:".length));
    else simple.push(scope);
  }

  const jobs: Array<() => Promise<void>> = [
    ...simple.map((scope) => async () => {
      try {
        counts[scope] = await countScope(scope);
      } catch {
        // Leave this scope unlabeled rather than blocking the rest.
      }
    }),
  ];
  if (splitToday) {
    jobs.push(async () => {
      try {
        const split = await countNowAndLaterToday(now);
        counts["focus:now"] = split.now;
        counts["focus:later-today"] = split.later;
        nextStart = split.nextStart;
      } catch {
        // Same as simple scopes.
      }
    });
  }
  if (pausedTagIds.length > 0) {
    jobs.push(async () => {
      try {
        const byTag = await countPausedTags(pausedTagIds);
        for (const id of pausedTagIds) counts[`paused-tag:${id}`] = byTag[id] ?? 0;
      } catch {
        // Same as simple scopes.
      }
    });
  }

  await mapPool(jobs, COUNT_CONCURRENCY, (job) => job());
  return { counts, nextStart };
}
