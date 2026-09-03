import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { URLSearchParams } from "url";
import { Preferences, DiscoveryResponse, ModelNode, SourceNode } from "./types";

// Get fresh preferences each time to support live updates
const getPreferences = (): Preferences => getPreferenceValues();

export const getBaseUrl = (): string => {
  const preferences = getPreferences();
  const region = preferences.dbtCloudRegion || "us";
  switch (region) {
    case "us":
      return "https://cloud.getdbt.com";
    case "emea":
      return "https://emea.dbt.com";
    case "au":
      return "https://au.dbt.com";
    case "custom":
      // Support custom dbt Cloud instances (e.g., abc123.us1.dbt.com)
      if (preferences.dbtCloudCustomUrl) {
        const customUrl = preferences.dbtCloudCustomUrl.replace(/\/$/, ""); // Remove trailing slash
        return customUrl.startsWith("http") ? customUrl : `https://${customUrl}`;
      }
      return "https://cloud.getdbt.com";
    default:
      return "https://cloud.getdbt.com";
  }
};

// Discovery API (GraphQL) endpoint
export const getDiscoveryApiUrl = (): string => {
  const preferences = getPreferences();
  const region = preferences.dbtCloudRegion || "us";
  switch (region) {
    case "us":
      return "https://metadata.cloud.getdbt.com/graphql";
    case "emea":
      return "https://metadata.emea.dbt.com/graphql";
    case "au":
      return "https://metadata.au.dbt.com/graphql";
    case "custom":
      // Allow explicit override for edge cases
      if (preferences.dbtCloudCustomDiscoveryUrl) {
        const url = preferences.dbtCloudCustomDiscoveryUrl.replace(/\/$/, "");
        return url.startsWith("http") ? url : `https://${url}`;
      }
      // For cell-based instances, map cell prefix to the shared regional metadata endpoint
      // e.g., abc123.us1.dbt.com -> metadata.cloud.getdbt.com/graphql
      if (preferences.dbtCloudCustomUrl) {
        const customUrl = preferences.dbtCloudCustomUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
        const parts = customUrl.split(".");
        if (parts.length >= 3) {
          const cellRegion = parts[1].toLowerCase();
          if (cellRegion.startsWith("eu")) return "https://metadata.emea.dbt.com/graphql";
          if (cellRegion.startsWith("us")) return "https://metadata.cloud.getdbt.com/graphql";
          if (cellRegion.startsWith("au")) return "https://metadata.au.dbt.com/graphql";
          // Unknown cell — fall back to deriving from domain
          const regionPart = parts.slice(1).join(".");
          return `https://metadata.${regionPart}/graphql`;
        }
      }
      return "https://metadata.cloud.getdbt.com/graphql";
    default:
      return "https://metadata.cloud.getdbt.com/graphql";
  }
};

export const getAccountId = (): string => getPreferences().dbtCloudAccountID;
export const getToken = (): string => getPreferences().dbtCloudAPIToken;

// Headers for all API requests
const getHeaders = () => ({
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export async function fetchFromApi<T>(endpoint: string, errorMessage = "Could not fetch from API"): Promise<T[]> {
  const baseUrl = getBaseUrl();

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "GET",
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await response.json();
    return json["data"] as T[];
  } catch (error) {
    showToast(Toast.Style.Failure, "An error occurred", errorMessage);
    return [];
  }
}

// POST request to API
export async function postToApi<T>(
  endpoint: string,
  body: Record<string, unknown>,
  errorMessage = "Could not post to API"
): Promise<T | null> {
  const baseUrl = getBaseUrl();

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
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
  const baseUrl = getBaseUrl();
  const endpoint = `/api/v2/accounts/${accountId}/runs/${runId}/cancel/`;

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    showToast(Toast.Style.Success, "Run cancelled successfully");
    return true;
  } catch (error) {
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
export async function queryDiscoveryApi<T>(
  query: string,
  variables: Record<string, unknown>,
  errorMessage = "Could not fetch from Discovery API"
): Promise<T | null> {
  const discoveryUrl = getDiscoveryApiUrl();

  try {
    const response = await fetch(discoveryUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const json = (await response.json()) as DiscoveryResponse<T>;

    if (json.errors && json.errors.length > 0) {
      console.error("GraphQL Errors:", json.errors);
      showToast(Toast.Style.Failure, "GraphQL Error", json.errors[0].message);
      return null;
    }

    return json.data;
  } catch (error) {
    console.error("Discovery API Error:", error);
    showToast(Toast.Style.Failure, "An error occurred", errorMessage);
    return null;
  }
}

// GraphQL Queries - Using only fields that exist in the Discovery API schema
export const MODELS_QUERY = `
query GetModels($environmentId: BigInt!, $first: Int!) {
  environment(id: $environmentId) {
    applied {
      models(first: $first) {
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
query GetModelsWithLineage($environmentId: BigInt!, $first: Int!) {
  environment(id: $environmentId) {
    applied {
      models(first: $first) {
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
      }
    }
  }
}
`;

export const SOURCES_QUERY = `
query GetSources($environmentId: BigInt!, $first: Int!) {
  environment(id: $environmentId) {
    applied {
      sources(first: $first) {
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

// Fetch models from Discovery API
export async function fetchModels(environmentId: number, first = 100): Promise<ModelNode[]> {
  interface ModelsResponse {
    environment: {
      applied: {
        models: {
          edges: Array<{ node: ModelNode }>;
        };
      };
    };
  }

  const data = await queryDiscoveryApi<ModelsResponse>(
    MODELS_QUERY,
    { environmentId, first },
    "Could not fetch models"
  );

  if (!data?.environment?.applied?.models?.edges) {
    return [];
  }

  return data.environment.applied.models.edges.map((edge) => edge.node);
}

// Fetch ALL models with their lineage relationships (for full DAG visualization)
export async function fetchModelsWithLineage(environmentId: number, first = 500): Promise<ModelNode[]> {
  interface ModelsResponse {
    environment: {
      applied: {
        models: {
          edges: Array<{ node: ModelNode }>;
        };
      };
    };
  }

  const data = await queryDiscoveryApi<ModelsResponse>(
    MODELS_WITH_LINEAGE_QUERY,
    { environmentId, first },
    "Could not fetch models with lineage"
  );

  if (!data?.environment?.applied?.models?.edges) {
    return [];
  }

  return data.environment.applied.models.edges.map((edge) => edge.node);
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
    "Could not fetch model lineage"
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
        sources: {
          edges: Array<{ node: SourceNode }>;
        };
      };
    };
  }

  const data = await queryDiscoveryApi<SourcesResponse>(
    SOURCES_QUERY,
    { environmentId, first },
    "Could not fetch sources"
  );

  if (!data?.environment?.applied?.sources?.edges) {
    return [];
  }

  return data.environment.applied.sources.edges.map((edge) => edge.node);
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

// Build dbt Cloud docs URL
export const buildDocsUrl = (projectId: number, uniqueId: string): string => {
  const baseUrl = getBaseUrl();
  const accountId = getAccountId();
  return `${baseUrl}/explore/${accountId}/projects/${projectId}/docs/${encodeURIComponent(uniqueId)}`;
};

// Build lineage URL
export const buildLineageUrl = (projectId: number, uniqueId: string): string => {
  const baseUrl = getBaseUrl();
  const accountId = getAccountId();
  return `${baseUrl}/explore/${accountId}/projects/${projectId}/lineage/${encodeURIComponent(uniqueId)}`;
};

// ============================================
// Job Performance / Run Analytics
// ============================================

// Fetch job run details including timing information
export async function fetchJobRunDetails(jobId: number, limit = 50): Promise<any[]> {
  const endpoint = buildApiUrl(`/jobs/${jobId}/runs/`, {
    limit,
    order_by: "-finished_at",
    include_related: JSON.stringify(["trigger", "job", "environment"]),
  });

  try {
    const runs = await fetchFromApi<any>(endpoint, "Could not fetch job run details");
    return runs;
  } catch (error) {
    showToast(Toast.Style.Failure, "Failed to fetch job run details");
    return [];
  }
}

// Fetch job run metrics with execution time data
export async function fetchJobRunMetrics(jobId: number, limit = 50) {
  const runs = await fetchJobRunDetails(jobId, limit);

  return runs.map((run: any) => ({
    runId: run.id,
    jobId: run.job_definition_id,
    jobName: run.job?.name || "Unknown",
    status: run.status,
    statusHumanized: run.status_humanized,
    executeStartedAt: run.started_at,
    executeCompletedAt: run.finished_at,
    executionTime: run.duration ? parseFloat(run.duration) : 0,
    runElapsedTime: run.run_duration ? parseFloat(run.run_duration) : 0,
    createdAt: run.created_at,
    finishedAt: run.finished_at,
  }));
}
