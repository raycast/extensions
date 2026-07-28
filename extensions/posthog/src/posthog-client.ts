import { environment, getPreferenceValues } from "@raycast/api";
import fs from "fs";
import os from "os";
import path from "path";

type CredentialsFile = {
  host?: string;
  apiHost?: string;
  personalAPIKey?: string;
  personal_api_key?: string;
  posthogPersonalApiKey?: string;
  token?: string;
  apiKey?: string;
  api_key?: string;
  projectId?: number | string;
  project_id?: number | string;
};

type RequestOptions = {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};

export type ProjectResourceSearchInput = {
  projectId?: number;
  search?: string;
  limit?: number;
  includeFilters?: boolean;
};

export type PaginatedResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

export type Project = {
  id: number;
  name?: string;
  uuid?: string;
  organization?: { id?: string; name?: string };
  timezone?: string;
};

export type HogQLResponse = {
  columns?: string[];
  results?: unknown[][];
  types?: string[];
  hogql?: string;
  clickhouse?: string;
  id?: string;
  query_status?: {
    id?: string;
    query_id?: string;
    status?: string;
    complete?: boolean;
    error?: string;
    results?: unknown[][];
    columns?: string[];
    types?: string[];
  };
  status?: string;
  complete?: boolean;
  error?: string;
};

const DEFAULT_HOST = "https://us.posthog.com";
const MAX_LIMIT = 200;
const MAX_QUERY_ROWS = 1000;
const DEFAULT_CELL_LENGTH = 500;

export function normalizeHost(host?: string): string {
  if (!host) return DEFAULT_HOST;
  const normalized = host.replace(/\/$/, "");
  if (normalized === "https://app.posthog.com") return DEFAULT_HOST;
  return normalized;
}

function isPersonalApiKey(value?: string): value is string {
  return Boolean(value && value.trim().startsWith("phx_"));
}

function readCredentialsFile(filePath?: string): CredentialsFile | undefined {
  if (!filePath) return undefined;

  try {
    if (!fs.existsSync(filePath)) return undefined;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as CredentialsFile;
  } catch {
    return undefined;
  }
}

function getCredentialFiles(): CredentialsFile[] {
  const candidates = [
    process.env.POSTHOG_CONFIG,
    path.join(process.cwd(), "credentials.json"),
    path.join(environment.assetsPath, "..", "credentials.json"),
    path.join(os.homedir(), ".config", "posthog", "credentials.json"),
  ];

  return candidates
    .filter((candidate): candidate is string => Boolean(candidate))
    .map(readCredentialsFile)
    .filter(Boolean) as CredentialsFile[];
}

function getFileApiKey(file: CredentialsFile): string | undefined {
  return (
    file.personalAPIKey ??
    file.personal_api_key ??
    file.posthogPersonalApiKey ??
    file.token ??
    file.apiKey ??
    file.api_key
  );
}

function getFileHost(file: CredentialsFile): string | undefined {
  return file.host ?? file.apiHost;
}

function getFileProjectId(file: CredentialsFile): number | string | undefined {
  return file.projectId ?? file.project_id;
}

function getCredentials() {
  const preferences = getPreferenceValues<Preferences>();
  const files = getCredentialFiles();

  const apiKey = [
    process.env.POSTHOG_PERSONAL_API_KEY,
    process.env.POSTHOG_API_KEY,
    ...files.map(getFileApiKey),
    preferences.personalAPIKey,
  ].find(isPersonalApiKey);

  if (!apiKey) {
    throw new Error(
      "Missing PostHog personal API key. Use a phx_ personal API key in extension preferences, POSTHOG_PERSONAL_API_KEY, POSTHOG_CONFIG, or ~/.config/posthog/credentials.json. Project keys starting with phc_ are intentionally ignored.",
    );
  }

  const host = normalizeHost(
    process.env.POSTHOG_HOST ??
      process.env.POSTHOG_API_HOST ??
      files.map(getFileHost).find(Boolean) ??
      preferences.dataRegionURL,
  );

  const defaultProjectId =
    process.env.POSTHOG_PROJECT_ID ?? files.map(getFileProjectId).find(Boolean) ?? preferences.defaultProjectId;

  return {
    apiKey,
    host,
    defaultProjectId: defaultProjectId ? Number(defaultProjectId) : undefined,
  };
}

export function getDefaultProjectId(projectId?: number): number {
  if (projectId) return projectId;

  const { defaultProjectId } = getCredentials();
  if (!defaultProjectId) {
    throw new Error("Missing projectId. Pass projectId explicitly or set Default Project ID in preferences.");
  }

  return defaultProjectId;
}

function buildUrl(host: string, endpoint: string, query?: RequestOptions["query"]): string {
  const url = new URL(`/api/${endpoint.replace(/^\//, "")}`, host);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export async function posthogRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { apiKey, host } = getCredentials();
  const response = await fetch(buildUrl(host, endpoint, options.query), {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PostHog API request failed: ${response.status} ${response.statusText}${text ? `: ${text}` : ""}`);
  }

  return (await response.json()) as T;
}

export function clampLimit(limit: number | undefined, fallback = 50, max = MAX_LIMIT): number {
  if (!limit || !Number.isFinite(limit)) return fallback;
  return Math.max(1, Math.min(Math.floor(limit), max));
}

export function truncateValue(value: unknown, maxLength = DEFAULT_CELL_LENGTH): unknown {
  if (typeof value === "string" && value.length > maxLength) {
    return `${value.slice(0, maxLength)}…`;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => truncateValue(item, maxLength));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 50);
    return Object.fromEntries(entries.map(([key, entryValue]) => [key, truncateValue(entryValue, maxLength)]));
  }

  return value;
}

export function pickProperties(
  properties: Record<string, unknown> | undefined,
  propertyKeys: string[] | undefined,
  maxLength?: number,
) {
  if (!properties) return undefined;

  const entries = propertyKeys?.length
    ? propertyKeys.map((key) => [key, properties[key]] as const).filter(([, value]) => value !== undefined)
    : Object.entries(properties).slice(0, 25);

  return Object.fromEntries(entries.map(([key, value]) => [key, truncateValue(value, maxLength)]));
}

export async function listProjects(search?: string, limit?: number): Promise<PaginatedResponse<Project>> {
  return posthogRequest<PaginatedResponse<Project>>("projects/", {
    query: {
      search,
      limit: clampLimit(limit),
    },
  });
}

export async function listProjectResources<T>({
  projectId,
  endpoint,
  search,
  limit,
  defaultLimit,
  maxLimit,
}: {
  projectId?: number;
  endpoint: string;
  search?: string;
  limit?: number;
  defaultLimit?: number;
  maxLimit?: number;
}) {
  const resolvedProjectId = getDefaultProjectId(projectId);
  const response = await posthogRequest<PaginatedResponse<T>>(`projects/${resolvedProjectId}/${endpoint}/`, {
    query: {
      search,
      limit: clampLimit(limit, defaultLimit, maxLimit),
    },
  });

  return { resolvedProjectId, response };
}

function hasQueryResults(response: HogQLResponse): boolean {
  return Array.isArray(response.results) || Array.isArray(response.query_status?.results);
}

function getQueryStatus(response: HogQLResponse): string | undefined {
  return response.query_status?.status ?? response.status;
}

function getQueryId(response: HogQLResponse): string | undefined {
  return response.query_status?.id ?? response.query_status?.query_id ?? response.id;
}

export async function runHogQL({
  projectId,
  query,
  maxRows,
  maxCellLength,
}: {
  projectId?: number;
  query: string;
  maxRows?: number;
  maxCellLength?: number;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery.startsWith("select") && !normalizedQuery.startsWith("with")) {
    throw new Error("Only read-only HogQL SELECT queries are supported.");
  }

  const resolvedProjectId = getDefaultProjectId(projectId);
  const rowLimit = clampLimit(maxRows, 100, MAX_QUERY_ROWS);
  const cellLength = clampLimit(maxCellLength, DEFAULT_CELL_LENGTH, 5000);

  let response = await posthogRequest<HogQLResponse>(`projects/${resolvedProjectId}/query/`, {
    method: "POST",
    body: {
      query: {
        kind: "HogQLQuery",
        query,
      },
    },
  });

  const queryId = getQueryId(response);
  let status = getQueryStatus(response);
  let attempts = 0;

  while (!hasQueryResults(response) && queryId && status !== "failed" && status !== "error" && attempts < 30) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    response = await posthogRequest<HogQLResponse>(`projects/${resolvedProjectId}/query/${queryId}/`);
    status = getQueryStatus(response);
    attempts += 1;
  }

  const columns = response.columns ?? response.query_status?.columns ?? [];
  const results = response.results ?? response.query_status?.results ?? [];

  if (response.error || response.query_status?.error || status === "failed" || status === "error") {
    throw new Error(response.error ?? response.query_status?.error ?? "PostHog query failed");
  }

  if (!hasQueryResults(response) && attempts >= 30) {
    throw new Error("PostHog query timed out after 30 seconds. Try simplifying the query or adding a LIMIT.");
  }

  const rows = results.slice(0, rowLimit).map((row) => {
    if (!Array.isArray(row)) return truncateValue(row, cellLength);
    return Object.fromEntries(columns.map((column, index) => [column, truncateValue(row[index], cellLength)]));
  });

  return {
    projectId: resolvedProjectId,
    columns,
    types: response.types ?? response.query_status?.types,
    rows,
    rowCount: results.length,
    returnedRows: rows.length,
    truncated: results.length > rows.length,
    queryId,
    status,
  };
}
