import { getPreferenceValues } from "@raycast/api";
import { AwxPreferences, LaunchResponse, Paginated, UnifiedJob, WorkflowNode } from "./types";

export function getPreferences(): AwxPreferences {
  return getPreferenceValues<AwxPreferences>();
}

/** Base API URL with a normalized (no trailing slash) host. */
export function apiBase(): string {
  const { awxUrl } = getPreferences();
  return `${awxUrl.trim().replace(/\/+$/, "")}/api/v2`;
}

export function authHeaders(): Record<string, string> {
  const { awxToken } = getPreferences();
  return {
    Authorization: `Bearer ${awxToken.trim()}`,
    "Content-Type": "application/json",
  };
}

export async function launchTemplate(id: number, extraVars?: string): Promise<LaunchResponse> {
  const body: Record<string, unknown> = {};
  if (extraVars && extraVars.trim()) {
    body.extra_vars = extraVars.trim();
  }
  const res = await fetch(`${apiBase()}/job_templates/${id}/launch/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await describeError(res));
  }
  return (await res.json()) as LaunchResponse;
}

/** Launch an entire workflow (runs all of its stages in graph order). */
export async function launchWorkflow(id: number, extraVars?: string): Promise<LaunchResponse> {
  const body: Record<string, unknown> = {};
  if (extraVars && extraVars.trim()) {
    body.extra_vars = extraVars.trim();
  }
  const res = await fetch(`${apiBase()}/workflow_job_templates/${id}/launch/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await describeError(res));
  }
  return (await res.json()) as LaunchResponse;
}

/** Order a workflow's nodes topologically (roots first) so stages read in run order. */
export function orderWorkflowNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childIds = new Set<number>();
  for (const n of nodes) {
    for (const c of [...n.success_nodes, ...n.failure_nodes, ...n.always_nodes]) {
      childIds.add(c);
    }
  }
  const ordered: WorkflowNode[] = [];
  const seen = new Set<number>();
  const queue = nodes.filter((n) => !childIds.has(n.id));
  while (queue.length) {
    const n = queue.shift();
    if (!n || seen.has(n.id)) continue;
    seen.add(n.id);
    ordered.push(n);
    for (const c of [...n.success_nodes, ...n.failure_nodes, ...n.always_nodes]) {
      const child = byId.get(c);
      if (child && !seen.has(child.id)) queue.push(child);
    }
  }
  // Append anything unreachable (cycles / orphans) so nothing is dropped.
  for (const n of nodes) {
    if (!seen.has(n.id)) ordered.push(n);
  }
  return ordered;
}

/** API sub-resource per unified job type, for type-specific endpoints like cancel. */
const JOB_API_RESOURCES: Record<string, string> = {
  job: "jobs",
  project_update: "project_updates",
  inventory_update: "inventory_updates",
  system_job: "system_jobs",
  ad_hoc_command: "ad_hoc_commands",
  workflow_job: "workflow_jobs",
};

/** Cancel a running unified job, resolving the correct sub-resource for its type. */
export async function cancelJob(job: UnifiedJob): Promise<void> {
  const resource = JOB_API_RESOURCES[job.type] ?? "jobs";
  const res = await fetch(`${apiBase()}/${resource}/${job.id}/cancel/`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(await describeError(res));
  }
}

async function describeError(res: Response): Promise<string> {
  let detail = "";
  try {
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { detail?: string; [k: string]: unknown };
      detail = json.detail ?? text;
    } catch {
      detail = text;
    }
  } catch {
    // ignore body read failures
  }
  const prefix = `AWX request failed (${res.status} ${res.statusText})`;
  return detail ? `${prefix}: ${detail}` : prefix;
}

/** Fetch every page of a paginated list endpoint, following `next` (bounded by `max`). */
export async function fetchAll<T>(url: string, max = 1000): Promise<T[]> {
  const { awxUrl } = getPreferences();
  const origin = awxUrl.trim().replace(/\/+$/, "");
  const out: T[] = [];
  let next: string | null = url;
  while (next && out.length < max) {
    const full = next.startsWith("http") ? next : `${origin}${next}`;
    const res = await fetch(full, { headers: authHeaders() });
    if (!res.ok) {
      throw new Error(await describeError(res));
    }
    const page = (await res.json()) as Paginated<T>;
    out.push(...page.results);
    next = page.next;
  }
  return out;
}
