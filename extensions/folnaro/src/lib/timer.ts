import type { FolnaroApi } from "./folnaro";
import type { Customer, Project, TimeEntry } from "./types";

/** What a timer runs for: a project (which implies its customer) or a customer alone. */
export interface TimerTarget {
  projectId?: string;
  customerId?: string;
  activity?: string;
}

export function targetKey(target: TimerTarget): string {
  return [target.projectId ?? "", target.customerId ?? "", target.activity ?? ""].join("|");
}

export function targetOfEntry(entry: TimeEntry): TimerTarget | undefined {
  if (!entry.project_id && !entry.customer_id) return undefined;
  return {
    projectId: entry.project_id ?? undefined,
    customerId: entry.project_id ? undefined : (entry.customer_id ?? undefined),
    activity: entry.activity || undefined,
  };
}

/**
 * Recent timer targets, newest first: what the person started from Raycast (kept locally), then
 * the targets of the latest time entries in Folnaro. Each target appears once; targets whose
 * project or customer no longer exists (archived, deleted) are dropped.
 */
export function recentTargets(
  stored: TimerTarget[],
  entries: TimeEntry[],
  known: { projects: Map<string, Project>; customers: Map<string, Customer> },
  limit = 6,
): TimerTarget[] {
  const seen = new Set<string>();
  const result: TimerTarget[] = [];
  const candidates = [...stored, ...entries.map(targetOfEntry).filter((target): target is TimerTarget => !!target)];
  for (const target of candidates) {
    if (target.projectId && !known.projects.has(target.projectId)) continue;
    if (!target.projectId && (!target.customerId || !known.customers.has(target.customerId))) continue;
    const key = targetKey(target);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(target);
    if (result.length >= limit) break;
  }
  return result;
}

/** Puts `target` first in the locally kept list. */
export function rememberTarget(stored: TimerTarget[], target: TimerTarget, max = 8): TimerTarget[] {
  const key = targetKey(target);
  return [target, ...stored.filter((item) => targetKey(item) !== key)].slice(0, max);
}

/** "Website relaunch · Example GmbH", the way a target is named in lists and toasts. */
export function describeTarget(
  target: TimerTarget,
  known: { projects: Map<string, Project>; customers: Map<string, Customer> },
): { title: string; subtitle?: string } {
  const project = target.projectId ? known.projects.get(target.projectId) : undefined;
  const customerId = project?.customer_id ?? target.customerId;
  const customer = customerId ? known.customers.get(customerId) : undefined;
  if (project) {
    return {
      title: project.name,
      subtitle: [target.activity, customer?.display_name].filter(Boolean).join(" · ") || undefined,
    };
  }
  return { title: customer?.display_name ?? "", subtitle: target.activity };
}

/** Name of what a running or stopped entry was for, for menu bar and toasts. */
export function describeEntry(
  entry: TimeEntry,
  known: { projects: Map<string, Project>; customers: Map<string, Customer> },
): string | undefined {
  const target = targetOfEntry(entry);
  if (!target) return undefined;
  const { title } = describeTarget(target, known);
  return title || undefined;
}

/** Only projects one can still work on: not archived and not done. */
export function workableProjects(projects: Project[]): Project[] {
  return projects.filter((project) => !project.is_archived && project.status !== "done");
}

export function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

/**
 * Starts the timer for `target`, stopping a running one first when asked ("Stop and Start").
 * The person starts it themselves, so the entry counts right away (`approved`); `proposed` is for
 * time an agent suggests on its own (docs/mcp/time.md, time_start_timer).
 */
export async function startTimerFor(
  api: FolnaroApi,
  target: TimerTarget,
  note: string | undefined,
  stopFirst: boolean,
): Promise<TimeEntry> {
  if (stopFirst) await api.stopTimer();
  return api.startTimer({
    project_id: target.projectId,
    customer_id: target.projectId ? undefined : target.customerId,
    activity: target.activity,
    note: note?.trim() || undefined,
    status: "approved",
  });
}
