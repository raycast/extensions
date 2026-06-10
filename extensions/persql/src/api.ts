import { getPreferenceValues } from "@raycast/api";

export interface Database {
  id: string;
  slug: string;
  name: string;
  status: string;
  region: string;
  forkedFromId?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowsRead: number;
  rowsWritten: number;
}

export interface Me {
  namespaceSlug: string;
  namespaceId: string;
  role: string;
}

export function apiBase(): string {
  const { apiUrl } = getPreferenceValues<Preferences>();
  return (apiUrl || "https://api.persql.com").replace(/\/+$/, "");
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const { token } = getPreferenceValues<Preferences>();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  let body: { success: boolean; data?: T; error?: string };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    throw new Error(`HTTP ${res.status}`);
  }
  if (!res.ok || !body.success) {
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return body.data as T;
}

export const getMe = () => api<Me>("/v1/me");

export const listDatabases = () =>
  api<Database[]>("/v1/databases?pageSize=100");

export const runQuery = (ns: string, db: string, sql: string) =>
  api<QueryResult>(`/v1/db/${ns}/${db}/query`, {
    method: "POST",
    body: JSON.stringify({ sql }),
  });

export const createDatabase = (name: string, slug: string) =>
  api<Database>("/v1/databases", {
    method: "POST",
    body: JSON.stringify({ name, slug }),
  });

export function consoleUrl(ns: string, dbSlug?: string): string {
  const base = apiBase().includes("staging")
    ? "https://console-staging.persql.com"
    : "https://console.persql.com";
  return dbSlug ? `${base}/${ns}/databases/${dbSlug}` : `${base}/${ns}`;
}

export function resultMarkdown(result: QueryResult): string {
  if (result.columns.length === 0) {
    return `**OK** — ${result.rowsWritten} row${result.rowsWritten === 1 ? "" : "s"} written`;
  }
  const esc = (v: unknown) =>
    v === null || v === undefined
      ? ""
      : String(v).replaceAll("|", "\\|").replaceAll("\n", " ");
  const header = `| ${result.columns.join(" | ")} |`;
  const sep = `| ${result.columns.map(() => "---").join(" | ")} |`;
  const rows = result.rows
    .slice(0, 200)
    .map((r) => `| ${r.map(esc).join(" | ")} |`);
  const truncated =
    result.rows.length > 200
      ? `\n\n_…${result.rows.length - 200} more rows not shown_`
      : "";
  return [header, sep, ...rows].join("\n") + truncated;
}
