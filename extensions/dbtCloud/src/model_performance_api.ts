import { fetchDiscoveryConnection, queryDiscoveryApi } from "./api";

export type ModelRunStatus = "success" | "warn" | "error" | "skipped" | "reused";

export interface ModelPerformanceNode {
  uniqueId: string;
  name: string;
  description: string | null;
  materializedType: string | null;
  tags: string[] | null;
  executionInfo: {
    executionTime: number | null;
    lastRunStatus: ModelRunStatus | null;
    lastRunGeneratedAt: string | null;
    lastRunId: number | null;
    lastRunError: string | null;
    lastJobDefinitionId: number | null;
  } | null;
}

export interface ModelRun {
  runId: number;
  jobId: number | null;
  status: string | null;
  error: string | null;
  executionTime: number | null;
  runElapsedTime: number | null;
  runGeneratedAt: string | null;
  executeStartedAt: string | null;
  executeCompletedAt: string | null;
}

const MODEL_PERFORMANCE_QUERY = `
query GetModelPerformance($environmentId: BigInt!, $first: Int!, $after: String) {
  environment(id: $environmentId) {
    applied {
      models(first: $first, after: $after) {
        edges {
          node {
            uniqueId
            name
            description
            materializedType
            tags
            executionInfo {
              executionTime
              lastRunStatus
              lastRunGeneratedAt
              lastRunId
              lastRunError
              lastJobDefinitionId
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

const MODEL_HISTORICAL_RUNS_QUERY = `
query GetModelHistoricalRuns($environmentId: BigInt!, $uniqueId: String!, $lastRunCount: Int!) {
  environment(id: $environmentId) {
    applied {
      modelHistoricalRuns(uniqueId: $uniqueId, lastRunCount: $lastRunCount) {
        runId
        jobId
        status
        error
        executionTime
        runElapsedTime
        runGeneratedAt
        executeStartedAt
        executeCompletedAt
      }
    }
  }
}
`;

// Every model in the environment with its latest execution info (the list view sorts these by execution time)
export function fetchModelPerformance(environmentId: number): Promise<ModelPerformanceNode[]> {
  interface Response {
    environment: { applied: { models: { edges: Array<{ node: ModelPerformanceNode }> } } };
  }
  return fetchDiscoveryConnection<ModelPerformanceNode, Response>(
    MODEL_PERFORMANCE_QUERY,
    { environmentId, first: 500 },
    (data) => data.environment?.applied?.models,
    "Could not fetch model performance",
  );
}

// The model's most recent runs in this environment, newest first
export async function fetchModelHistoricalRuns(
  environmentId: number,
  uniqueId: string,
  lastRunCount = 50,
): Promise<ModelRun[]> {
  interface Response {
    environment: { applied: { modelHistoricalRuns: ModelRun[] | null } };
  }
  const data = await queryDiscoveryApi<Response>(
    MODEL_HISTORICAL_RUNS_QUERY,
    { environmentId, uniqueId, lastRunCount },
    "Could not fetch model run history",
  );
  const runs = data?.environment?.applied?.modelHistoricalRuns ?? [];
  return [...runs].sort((a, b) => (b.runGeneratedAt ?? "").localeCompare(a.runGeneratedAt ?? ""));
}
