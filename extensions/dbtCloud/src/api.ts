import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { DiscoveryResponse, ModelNode, RunModel, SourceNode } from "./types";

// Get fresh preferences each time to support live updates
const getPreferences = (): Preferences => getPreferenceValues<Preferences>();

const MAX_REST_PAGES = 20;
const MAX_DISCOVERY_PAGES = 20;

interface RestPagination {
  limit?: number;
  offset?: number;
  count?: number;
  total_count?: number;
  totalCount?: number;
  next_offset?: number;
  nextOffset?: number;
  next?: string | null;
}

interface RestResponse<T> {
  data?: T[];
  extra?: {
    pagination?: RestPagination;
  };
}

interface DiscoveryPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface DiscoveryConnection<T> {
  edges: Array<{ node: T }>;
  pageInfo?: DiscoveryPageInfo;
}

// Requests carry a bearer token, so never allow a custom endpoint to downgrade to plaintext.
const toHttpsUrl = (value: string): string =>
  `https://${value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")}`;

export const getBaseUrl = (): string => {
  const preferences = getPreferences();
  const endpoint = preferences.dbtCloudEndpoint || "https://cloud.getdbt.com";
  if (endpoint.includes("{account_prefix}")) {
    const accountPrefix = preferences.dbtCloudAcountPrefix?.trim();
    if (!accountPrefix) {
      throw new Error(
        "The selected endpoint requires a dbt Cloud Account Prefix. Please set it in the extension preferences.",
      );
    }
    return toHttpsUrl(endpoint.replace("{account_prefix}", accountPrefix));
  }
  return toHttpsUrl(endpoint);
};

// Discovery API (GraphQL) endpoint, derived from the Access URL unless overridden
export const getDiscoveryApiUrl = (): string => {
  const preferences = getPreferences();
  if (preferences.dbtCloudCustomDiscoveryUrl) {
    // The Discovery API only answers on /graphql, so a bare host or the /api base from the docs is pointed there
    const custom = new URL(toHttpsUrl(preferences.dbtCloudCustomDiscoveryUrl));
    if (/^\/(api\/?)?$/i.test(custom.pathname)) custom.pathname = "/graphql";
    return custom.toString().replace(/\/$/, "");
  }

  const host = new URL(getBaseUrl()).hostname;
  // Multi-tenant hosts: cloud.getdbt.com, emea.dbt.com, au.dbt.com
  if (host === "cloud.getdbt.com") return "https://metadata.cloud.getdbt.com/graphql";
  const parts = host.split(".");
  if (parts.length === 3) return `https://metadata.${host}/graphql`;
  // Cell-based hosts: abc123.us1.dbt.com -> abc123.metadata.us1.dbt.com
  return `https://${parts[0]}.metadata.${parts.slice(1).join(".")}/graphql`;
};

export const getAccountId = (): string => getPreferences().dbtCloudAcountID;
export const getToken = (): string => getPreferences().dbtCloudAPIToken;

// Headers for all API requests
const getHeaders = () => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

const getNumber = (value: number | string | undefined | null): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getNextRestPageUrl = (currentUrl: URL, pagination: RestPagination | undefined, pageSize: number): URL | null => {
  if (!pagination) {
    return null;
  }

  if (pagination.next) {
    return new URL(pagination.next, currentUrl);
  }

  const limit = getNumber(pagination.limit ?? currentUrl.searchParams.get("limit")) ?? pageSize;
  const offset = getNumber(pagination.offset ?? currentUrl.searchParams.get("offset")) ?? 0;
  const count = getNumber(pagination.count) ?? pageSize;
  const totalCount = getNumber(pagination.total_count ?? pagination.totalCount);
  const nextOffset = getNumber(pagination.next_offset ?? pagination.nextOffset);

  if (nextOffset !== null) {
    const nextUrl = new URL(currentUrl.toString());
    nextUrl.searchParams.set("offset", String(nextOffset));
    if (!nextUrl.searchParams.has("limit")) {
      nextUrl.searchParams.set("limit", String(limit));
    }
    return nextUrl;
  }

  if (totalCount !== null && offset + count >= totalCount) {
    return null;
  }

  if (count < limit) {
    return null;
  }

  const nextUrl = new URL(currentUrl.toString());
  nextUrl.searchParams.set("offset", String(offset + limit));
  if (!nextUrl.searchParams.has("limit")) {
    nextUrl.searchParams.set("limit", String(limit));
  }
  return nextUrl;
};

// maxResults stops pagination early for endpoints where only the newest items matter (e.g. runs)
export async function fetchFromApi<T>(
  endpoint: string,
  errorMessage = "Could not fetch from API",
  maxResults?: number,
): Promise<T[]> {
  try {
    let nextUrl: URL | null = new URL(endpoint, getBaseUrl());
    const results: T[] = [];

    for (let page = 0; nextUrl && page < MAX_REST_PAGES; page++) {
      const response = await fetch(nextUrl.toString(), {
        method: "GET",
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${nextUrl.pathname}`);
      }

      const json = (await response.json()) as RestResponse<T>;
      const pageData = Array.isArray(json.data) ? json.data : [];
      results.push(...pageData);

      if (pageData.length === 0 || (maxResults !== undefined && results.length >= maxResults)) {
        return maxResults !== undefined ? results.slice(0, maxResults) : results;
      }

      nextUrl = getNextRestPageUrl(nextUrl, json.extra?.pagination, pageData.length);
    }

    if (nextUrl) {
      console.warn(`REST pagination stopped after ${MAX_REST_PAGES} pages for ${endpoint}`);
    }

    return results;
  } catch (error) {
    console.error("GET Error:", error);
    showToast(Toast.Style.Failure, errorMessage, error instanceof Error ? error.message : String(error));
    return [];
  }
}

// GET a single record (endpoints such as /runs/{id}/ return an object, not a list).
// quiet skips the failure toast when the caller has a fallback.
export async function fetchOneFromApi<T>(
  endpoint: string,
  errorMessage = "Could not fetch from API",
  quiet = false,
): Promise<T | null> {
  try {
    const url = new URL(endpoint, getBaseUrl());
    const response = await fetch(url.toString(), { method: "GET", headers: getHeaders() });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url.pathname}`);
    }
    const json = (await response.json()) as { data?: T };
    return json.data ?? null;
  } catch (error) {
    console.error("GET Error:", error);
    if (!quiet) showToast(Toast.Style.Failure, errorMessage, error instanceof Error ? error.message : String(error));
    return null;
  }
}

// POST request to API
export async function postToApi<T>(
  endpoint: string,
  body: Record<string, unknown>,
  errorMessage = "Could not post to API",
): Promise<T | null> {
  try {
    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await response.json();
    return json["data"] as T;
  } catch (error) {
    console.error("POST Error:", error);
    showToast(Toast.Style.Failure, "An error occurred", errorMessage);
    return null;
  }
}

// Trigger a job run
export async function triggerJobRun(jobId: number, cause?: string, gitBranch?: string): Promise<{ id: number } | null> {
  const accountId = getAccountId();
  const endpoint = `/api/v2/accounts/${accountId}/jobs/${jobId}/run/`;

  const body: Record<string, unknown> = {
    cause: cause || "Triggered from Raycast",
  };

  if (gitBranch) {
    body.git_branch = gitBranch;
  }

  const result = await postToApi<{ id: number }>(endpoint, body, "Could not trigger job run");

  if (result) {
    showToast(Toast.Style.Success, "Job triggered successfully", `Run ID: ${result.id}`);
  }

  return result;
}

// Cancel a run
export async function cancelRun(runId: number): Promise<boolean> {
  const accountId = getAccountId();
  const endpoint = `/api/v2/accounts/${accountId}/runs/${runId}/cancel/`;

  try {
    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
      method: "POST",
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    showToast(Toast.Style.Success, "Run cancelled successfully");
    return true;
  } catch {
    showToast(Toast.Style.Failure, "Could not cancel run");
    return false;
  }
}

// Build API URL with account_id
export const buildApiUrl = (path: string, queryParams?: Record<string, string | number>): string => {
  const accountId = getAccountId();
  const baseUrl = `/api/v2/accounts/${accountId}${path}`;

  if (queryParams) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      params.append(key, String(value));
    });
    return `${baseUrl}?${params.toString()}`;
  }

  return baseUrl;
};

// Build dbt Cloud URL for opening in browser
export const buildDbtCloudUrl = (path: string): string => {
  const baseUrl = getBaseUrl();
  const accountId = getAccountId();
  return `${baseUrl}/deploy/${accountId}${path}`;
};

// Format relative time
export const formatRelativeTime = (dateString: string | null): string => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

// Format duration
export const formatDuration = (startDate: string | null, endDate: string | null): string => {
  if (!startDate) return "N/A";

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const remainingSecs = diffSecs % 60;

  if (diffMins === 0) return `${diffSecs}s`;
  return `${diffMins}m ${remainingSecs}s`;
};

export const getStatusText = (status: number): string => {
  switch (status) {
    case 10:
      return "Success";
    case 20:
      return "Error";
    case 30:
      return "Cancelled";
    case 1:
      return "Queued";
    case 3:
      return "Running";
    default:
      return "Unknown";
  }
};

// ============================================
// Discovery API (GraphQL) Functions
// ============================================

// Generic GraphQL query function
export async function fetchDiscoveryConnection<TNode, TData>(
  query: string,
  baseVariables: Record<string, unknown>,
  getConnection: (data: TData) => DiscoveryConnection<TNode> | undefined,
  errorMessage: string,
): Promise<TNode[]> {
  const results: TNode[] = [];
  let after: string | null = null;

  for (let page = 0; page < MAX_DISCOVERY_PAGES; page++) {
    const data: TData | null = await queryDiscoveryApi<TData>(query, { ...baseVariables, after }, errorMessage);
    const connection: DiscoveryConnection<TNode> | undefined = data ? getConnection(data) : undefined;

    if (!connection?.edges) {
      return page === 0 ? [] : results;
    }

    results.push(...connection.edges.map((edge: { node: TNode }) => edge.node));

    if (!connection.pageInfo?.hasNextPage || !connection.pageInfo.endCursor) {
      return results;
    }

    after = connection.pageInfo.endCursor;
  }

  console.warn(`Discovery pagination stopped after ${MAX_DISCOVERY_PAGES} pages`);
  return results;
}

export async function queryDiscoveryApi<T>(
  query: string,
  variables: Record<string, unknown>,
  errorMessage = "Could not fetch from Discovery API",
): Promise<T | null> {
  let discoveryUrl = "";
  try {
    discoveryUrl = getDiscoveryApiUrl();
    const response = await fetch(discoveryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    const body = await response.text();
    let json: DiscoveryResponse<T> | null = null;
    try {
      json = JSON.parse(body) as DiscoveryResponse<T>;
    } catch {
      // Non-JSON body (e.g. a proxy error page); reported below with the status code
    }

    if (json?.errors && json.errors.length > 0) {
      console.error("GraphQL Errors:", json.errors);
      showToast(Toast.Style.Failure, errorMessage, json.errors[0].message);
      return null;
    }

    if (!response.ok || !json) {
      const detail = body
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      throw new Error(`HTTP ${response.status} from ${discoveryUrl}${detail ? `: ${detail.slice(0, 160)}` : ""}`);
    }

    return json.data;
  } catch (error) {
    console.error("Discovery API Error:", error);
    showToast(Toast.Style.Failure, errorMessage, error instanceof Error ? error.message : String(error));
    return null;
  }
}

// GraphQL Queries - Using only fields that exist in the Discovery API schema
export const MODELS_QUERY = `
query GetModels($environmentId: BigInt!, $first: Int!, $after: String) {
  environment(id: $environmentId) {
    applied {
      models(first: $first, after: $after) {
        edges {
          node {
            uniqueId
            name
            description
            database
            schema
            alias
            resourceType
            tags
            meta
            access
            group
            contractEnforced
            latestVersion
            materializedType
            language
            catalog {
              columns {
                name
                type
                index
                description
                comment
              }
            }
            tests {
              uniqueId
              name
              columnName
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
`;

export const MODEL_WITH_LINEAGE_QUERY = `
query GetModelWithLineage($environmentId: BigInt!, $uniqueId: String!) {
  environment(id: $environmentId) {
    applied {
      models(first: 1, filter: { uniqueIds: [$uniqueId] }) {
        edges {
          node {
            uniqueId
            name
            description
            database
            schema
            alias
            resourceType
            tags
            meta
            access
            group
            contractEnforced
            materializedType
            compiledCode
            rawCode
            language
            catalog {
              columns {
                name
                type
                index
                description
                comment
              }
            }
            ancestors(types: [Model, Source, Seed, Snapshot]) {
              uniqueId
              name
              resourceType
              ... on ModelAppliedStateNestedNode {
                database
                schema
                alias
              }
              ... on SourceAppliedStateNestedNode {
                sourceName
              }
            }
            children {
              uniqueId
              name
              resourceType
            }
            tests {
              uniqueId
              name
              columnName
            }
          }
        }
      }
    }
  }
}
`;

// Query to fetch all models with their lineage relationships (for full DAG)
export const MODELS_WITH_LINEAGE_QUERY = `
query GetModelsWithLineage($environmentId: BigInt!, $first: Int!, $after: String) {
  environment(id: $environmentId) {
    applied {
      models(first: $first, after: $after) {
        edges {
          node {
            uniqueId
            name
            description
            database
            schema
            alias
            resourceType
            tags
            meta
            access
            group
            materializedType
            compiledCode
            ancestors(types: [Model, Source, Seed, Snapshot]) {
              uniqueId
              name
              resourceType
              ... on ModelAppliedStateNestedNode {
                database
                schema
                alias
              }
              ... on SourceAppliedStateNestedNode {
                sourceName
              }
            }
            children {
              uniqueId
              name
              resourceType
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
`;

export const SOURCES_QUERY = `
query GetSources($environmentId: BigInt!, $first: Int!, $after: String) {
  environment(id: $environmentId) {
    applied {
      sources(first: $first, after: $after) {
        edges {
          node {
            uniqueId
            name
            sourceName
            description
            database
            schema
            identifier
            resourceType
            tags
            meta
            loader
            freshness {
              freshnessJobDefinitionId
              freshnessRunId
              freshnessRunGeneratedAt
              freshnessStatus
              maxLoadedAt
              snapshottedAt
            }
            children {
              uniqueId
              name
              resourceType
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
`;

// Fetch models from Discovery API
export async function fetchModels(environmentId: number, first = 100): Promise<ModelNode[]> {
  interface ModelsResponse {
    environment: {
      applied: {
        models: DiscoveryConnection<ModelNode>;
      };
    };
  }

  return fetchDiscoveryConnection<ModelNode, ModelsResponse>(
    MODELS_QUERY,
    { environmentId, first },
    (data) => data.environment?.applied?.models,
    "Could not fetch models",
  );
}

// Fetch ALL models with their lineage relationships (for full DAG visualization)
export async function fetchModelsWithLineage(environmentId: number, first = 500): Promise<ModelNode[]> {
  interface ModelsResponse {
    environment: {
      applied: {
        models: DiscoveryConnection<ModelNode>;
      };
    };
  }

  return fetchDiscoveryConnection<ModelNode, ModelsResponse>(
    MODELS_WITH_LINEAGE_QUERY,
    { environmentId, first },
    (data) => data.environment?.applied?.models,
    "Could not fetch models with lineage",
  );
}

// Fetch model with full lineage
export async function fetchModelWithLineage(environmentId: number, uniqueId: string): Promise<ModelNode | null> {
  interface ModelResponse {
    environment: {
      applied: {
        models: {
          edges: Array<{ node: ModelNode }>;
        };
      };
    };
  }

  const data = await queryDiscoveryApi<ModelResponse>(
    MODEL_WITH_LINEAGE_QUERY,
    { environmentId, uniqueId },
    "Could not fetch model lineage",
  );

  if (!data?.environment?.applied?.models?.edges?.[0]) {
    return null;
  }

  return data.environment.applied.models.edges[0].node;
}

// Fetch sources from Discovery API
export async function fetchSources(environmentId: number, first = 100): Promise<SourceNode[]> {
  interface SourcesResponse {
    environment: {
      applied: {
        sources: DiscoveryConnection<SourceNode>;
      };
    };
  }

  return fetchDiscoveryConnection<SourceNode, SourcesResponse>(
    SOURCES_QUERY,
    { environmentId, first },
    (data) => data.environment?.applied?.sources,
    "Could not fetch sources",
  );
}

const SOURCE_BY_ID_QUERY = `
query GetSourceById($environmentId: BigInt!, $uniqueIds: [String!]) {
  environment(id: $environmentId) {
    applied {
      sources(first: 1, filter: { uniqueIds: $uniqueIds }) {
        edges {
          node {
            uniqueId
            name
            sourceName
            description
            database
            schema
            identifier
            resourceType
            tags
            meta
            loader
            freshness {
              freshnessJobDefinitionId
              freshnessRunId
              freshnessRunGeneratedAt
              freshnessStatus
              maxLoadedAt
              snapshottedAt
            }
            children {
              uniqueId
              name
              resourceType
            }
          }
        }
      }
    }
  }
}
`;

// Fetch one source by unique id, without paging through every source in the environment
export async function fetchSourceById(environmentId: number, uniqueId: string): Promise<SourceNode | null> {
  interface SourceResponse {
    environment: { applied: { sources: { edges: Array<{ node: SourceNode }> } } };
  }
  const data = await queryDiscoveryApi<SourceResponse>(
    SOURCE_BY_ID_QUERY,
    { environmentId, uniqueIds: [uniqueId] },
    "Could not fetch source",
  );
  return data?.environment?.applied?.sources?.edges?.[0]?.node ?? null;
}

// Resource type icons
export const getResourceTypeIcon = (resourceType: string): string => {
  switch (resourceType?.toLowerCase()) {
    case "model":
      return "📦";
    case "source":
      return "🗄️";
    case "seed":
      return "🌱";
    case "snapshot":
      return "📸";
    case "test":
      return "🧪";
    case "metric":
      return "📊";
    case "exposure":
      return "📈";
    default:
      return "📄";
  }
};

// Materialization type icons
export const getMaterializationIcon = (materializationType: string | null): string => {
  switch (materializationType?.toLowerCase()) {
    case "table":
      return "📋";
    case "view":
      return "👁️";
    case "incremental":
      return "➕";
    case "ephemeral":
      return "💨";
    case "snapshot":
      return "📸";
    default:
      return "📄";
  }
};

// Access level colors
export const getAccessColor = (access: string | null): string => {
  switch (access?.toLowerCase()) {
    case "public":
      return "🟢";
    case "protected":
      return "🟡";
    case "private":
      return "🔴";
    default:
      return "⚪";
  }
};

// Freshness status helpers
export const getFreshnessStatus = (status: string | null): string => {
  switch (status?.toLowerCase()) {
    case "pass":
      return "✅ Fresh";
    case "warn":
      return "⚠️ Warning";
    case "error":
      return "❌ Stale";
    default:
      return "❓ Unknown";
  }
};

// dbt Cloud web pages. Project pages live under /dashboard and project settings under /settings, while
// jobs, runs and environments live under /deploy (buildDbtCloudUrl). Catalog pages are dbt Explorer's, per
// environment ("production" or "staging").
export type ExplorerEnvironment = "production" | "staging";

export const buildProjectUrl = (projectId: number): string =>
  `${getBaseUrl()}/dashboard/${getAccountId()}/projects/${projectId}`;

export const buildProjectSettingsUrl = (projectId: number): string =>
  `${getBaseUrl()}/settings/accounts/${getAccountId()}/pages/projects/${projectId}`;

export const buildExplorerUrl = (projectId: number, environment: ExplorerEnvironment = "production"): string =>
  `${getBaseUrl()}/explore/${getAccountId()}/projects/${projectId}/environments/${environment}`;

// Explorer details page for a model, source, seed or snapshot
export const buildDocsUrl = (
  projectId: number,
  uniqueId: string,
  environment: ExplorerEnvironment = "production",
): string => `${buildExplorerUrl(projectId, environment)}/details/${encodeURIComponent(uniqueId)}`;

// dbt selector for the node and its direct neighbours: "+name+" for models, "source:src.table+" for sources
const lineageSelector = (uniqueId: string): string => {
  const parts = uniqueId.split(".");
  return parts[0] === "source" ? `source:${parts.slice(2).join(".")}+` : `+${parts[parts.length - 1]}+`;
};

// Explorer lineage graph focused on one node
export const buildLineageUrl = (
  projectId: number,
  uniqueId: string,
  environment: ExplorerEnvironment = "production",
): string => {
  const params = new URLSearchParams({ uniqueId, select: lineageSelector(uniqueId) });
  return `${buildExplorerUrl(projectId, environment)}/lineage/?${params.toString()}`;
};

// ============================================
// Job Performance / Run Analytics
// ============================================

// Fetch the newest runs of a job, newest first (ordered by id so queued and running runs sort correctly)
export async function fetchJobRunDetails(jobId: number, limit = 50): Promise<RunModel[]> {
  const endpoint = buildApiUrl("/runs/", {
    job_definition_id: jobId,
    limit: Math.min(limit, 100),
    order_by: "-id",
    include_related: JSON.stringify(["trigger", "job", "environment"]),
  });

  return fetchFromApi<RunModel>(endpoint, "Could not fetch job run details", limit);
}

// Duration strings come back as "HH:MM:SS" (optionally with fractional seconds) or as plain seconds
export const parseDurationSeconds = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parts = value.trim().split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
};

const secondsBetween = (start: string | null, end: string | null): number | null => {
  if (!start || !end) return null;
  const seconds = (new Date(end).getTime() - new Date(start).getTime()) / 1000;
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
};

export interface JobRunMetric {
  runId: number;
  jobId: number;
  jobName: string;
  status: number;
  statusHumanized: string;
  triggerCause: string | null;
  gitBranch: string | null;
  href: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  // Execution time (started -> finished), in seconds
  executionTime: number | null;
  // Queue + execution time (created -> finished), in seconds
  totalTime: number | null;
}

// Fetch job run metrics with execution time data
export async function fetchJobRunMetrics(jobId: number, limit = 50): Promise<JobRunMetric[]> {
  const runs = await fetchJobRunDetails(jobId, limit);

  return runs.map((run) => ({
    runId: run.id,
    jobId: run.job_definition_id,
    jobName: run.job?.name || "Unknown",
    status: run.status,
    statusHumanized: run.status_humanized,
    triggerCause: run.trigger?.cause || null,
    gitBranch: run.trigger?.git_branch || run.git_branch || null,
    href: run.href,
    createdAt: run.created_at,
    startedAt: run.started_at || null,
    finishedAt: run.finished_at || null,
    executionTime: parseDurationSeconds(run.run_duration) ?? secondsBetween(run.started_at, run.finished_at),
    totalTime: parseDurationSeconds(run.duration) ?? secondsBetween(run.created_at, run.finished_at),
  }));
}
