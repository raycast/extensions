import { accountLabel } from "../helpers/account-model";
import { AuthenticatedPostHogAccount, getAuthenticatedAccounts } from "../helpers/posthog-auth";
import { requireProjectId, resolveToolAccount } from "./tool-auth";

type RequestOptions = {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};

export type ProjectResourceSearchInput = {
  accountId?: string;
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

type ToolProject = {
  accountId: string;
  id: number;
  name?: string;
  uuid?: string;
  organization?: { id?: string; name?: string };
  timezone?: string;
};

type ToolAccountProjects = ReturnType<typeof accountSummary> & {
  count?: number;
  next?: string | null;
  projects: ToolProject[];
};

type ToolAccountFailure = ReturnType<typeof accountSummary> & {
  error: string;
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

const MAX_LIMIT = 200;
const MAX_QUERY_ROWS = 1000;
const DEFAULT_CELL_LENGTH = 500;

function buildUrl(host: string, endpoint: string, query?: RequestOptions["query"]): string {
  const url = new URL(`/api/${endpoint.replace(/^\//, "")}`, host);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function accountSummary(account: AuthenticatedPostHogAccount) {
  return {
    accountId: account.id,
    label: accountLabel(account),
    email: account.email,
    name: account.name,
    region: account.region,
    baseUrl: account.baseUrl,
  };
}

async function getConnectedAccounts(): Promise<AuthenticatedPostHogAccount[]> {
  const { accounts } = await getAuthenticatedAccounts();

  if (accounts.length === 0) {
    throw new Error("No PostHog accounts are connected. Open Manage Accounts and connect a PostHog account.");
  }

  return accounts;
}

export async function getToolAccount(accountId: string | undefined): Promise<AuthenticatedPostHogAccount> {
  return resolveToolAccount(await getConnectedAccounts(), accountId);
}

async function posthogRequestForAccount<T>(
  account: AuthenticatedPostHogAccount,
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(buildUrl(account.baseUrl, endpoint, options.query), {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
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

export async function posthogRequest<T>(
  accountId: string | undefined,
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  return posthogRequestForAccount(await getToolAccount(accountId), endpoint, options);
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

export async function listProjects(search?: string, limit?: number) {
  const accounts = await getConnectedAccounts();
  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const response = await posthogRequestForAccount<PaginatedResponse<Project>>(account, "projects/", {
        query: {
          search,
          limit: clampLimit(limit),
        },
      });

      return {
        ...accountSummary(account),
        count: response.count,
        next: response.next,
        projects: (response.results ?? []).map((project) => ({
          accountId: account.id,
          id: project.id,
          name: project.name,
          uuid: project.uuid,
          timezone: project.timezone,
          organization: project.organization
            ? { id: project.organization.id, name: project.organization.name }
            : undefined,
        })),
      };
    }),
  );

  const accountResults: ToolAccountProjects[] = [];
  const failures: ToolAccountFailure[] = [];

  results.forEach((result, index) => {
    const account = accounts[index];

    if (result.status === "fulfilled") {
      accountResults.push(result.value);
    } else {
      failures.push({
        ...accountSummary(account),
        error: String(result.reason),
      });
    }
  });

  return {
    accounts: accountResults,
    failures,
  };
}

export async function listProjectResources<T>({
  accountId,
  projectId,
  endpoint,
  search,
  limit,
  defaultLimit,
  maxLimit,
}: {
  accountId?: string;
  projectId?: number;
  endpoint: string;
  search?: string;
  limit?: number;
  defaultLimit?: number;
  maxLimit?: number;
}) {
  const account = await getToolAccount(accountId);
  const resolvedProjectId = requireProjectId(projectId);
  const response = await posthogRequestForAccount<PaginatedResponse<T>>(
    account,
    `projects/${resolvedProjectId}/${endpoint}/`,
    {
      query: {
        search,
        limit: clampLimit(limit, defaultLimit, maxLimit),
      },
    },
  );

  return { accountId: account.id, resolvedProjectId, response };
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
  accountId,
  projectId,
  query,
  maxRows,
  maxCellLength,
}: {
  accountId?: string;
  projectId?: number;
  query: string;
  maxRows?: number;
  maxCellLength?: number;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery.startsWith("select") && !normalizedQuery.startsWith("with")) {
    throw new Error("Only read-only HogQL SELECT queries are supported.");
  }

  const account = await getToolAccount(accountId);
  const resolvedProjectId = requireProjectId(projectId);
  const rowLimit = clampLimit(maxRows, 100, MAX_QUERY_ROWS);
  const cellLength = clampLimit(maxCellLength, DEFAULT_CELL_LENGTH, 5000);

  let response = await posthogRequestForAccount<HogQLResponse>(account, `projects/${resolvedProjectId}/query/`, {
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
    response = await posthogRequestForAccount<HogQLResponse>(
      account,
      `projects/${resolvedProjectId}/query/${queryId}/`,
    );
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
    accountId: account.id,
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
