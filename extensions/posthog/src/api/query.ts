import { api } from "./client";

export type QueryResponse = {
  results?: unknown[];
  columns?: string[];
  types?: string[];
  hogql?: string;
  query_status?: { complete?: boolean; error?: boolean; error_message?: string };
} & Record<string, unknown>;

export function runQuery(projectId: string | number, query: Record<string, unknown>, signal?: AbortSignal) {
  return api.post<QueryResponse>(`projects/${projectId}/query`, { query }, signal);
}

export function generateHogql(projectId: string | number, question: string, signal?: AbortSignal) {
  return api.post<{ hogql?: string; error?: string }>(
    `projects/${projectId}/query/generate`,
    { query: { kind: "HogQLAutocompleteQuery", select: question } },
    signal,
  );
}
