import { api } from "./client";
import { runQuery } from "./query";

export type ErrorIssueStatus = "active" | "resolved" | "archived" | "pending_release" | "suppressed";

export type ErrorIssue = {
  id: string;
  status: ErrorIssueStatus;
  name: string | null;
  description: string | null;
  first_seen: string;
  last_seen: string;
  occurrences: number;
  sessions: number;
  users: number;
};

/**
 * PostHog does not expose error tracking issues as a REST resource — they live behind the query API.
 * This wrapper runs an `ErrorTrackingQuery` and reshapes the row results into the friendlier `ErrorIssue` shape.
 */
export async function listErrorIssues(
  projectId: string | number,
  params?: { status?: ErrorIssueStatus; dateFrom?: string; dateTo?: string; orderBy?: string },
  signal?: AbortSignal,
): Promise<{ results: ErrorIssue[] }> {
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const query = {
    kind: "ErrorTrackingQuery",
    orderBy: params?.orderBy ?? "occurrences",
    orderDirection: "DESC",
    dateRange: {
      date_from: params?.dateFrom ?? sevenDaysAgo,
      date_to: params?.dateTo ?? new Date(now).toISOString(),
    },
    volumeResolution: 1,
    filterTestAccounts: true,
    status: params?.status ?? "active",
  };
  const result = await runQuery(projectId, query, signal);
  return { results: ((result.results ?? []) as unknown[]).map(normalizeIssue).filter((r): r is ErrorIssue => !!r) };
}

export async function getErrorIssue(projectId: string | number, issueId: string, signal?: AbortSignal) {
  const now = Date.now();
  const query = {
    kind: "ErrorTrackingQuery",
    dateRange: {
      date_from: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      date_to: new Date(now).toISOString(),
    },
    volumeResolution: 0,
    issueId,
  };
  const result = await runQuery(projectId, query, signal);
  return ((result.results ?? [])[0] as Record<string, unknown> | undefined) ?? { id: issueId };
}

export function updateErrorIssue(
  projectId: string | number,
  issueId: string,
  body: { status?: ErrorIssueStatus },
  signal?: AbortSignal,
) {
  return api.patch<ErrorIssue>(`projects/${projectId}/error_tracking/issues/${issueId}`, body, signal);
}

function normalizeIssue(row: unknown): ErrorIssue | undefined {
  if (!row || typeof row !== "object") return undefined;
  const r = row as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    status: (r.status as ErrorIssueStatus) ?? "active",
    name: (r.name as string) ?? null,
    description: (r.description as string) ?? null,
    first_seen: String(r.first_seen ?? ""),
    last_seen: String(r.last_seen ?? ""),
    occurrences: Number(r.occurrences ?? 0),
    sessions: Number(r.sessions ?? 0),
    users: Number(r.users ?? 0),
  };
}
