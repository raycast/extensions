import { getPreferences } from "./preferences";

const GITHUB_COM_API_BASE = "https://api.github.com";

function apiBaseForHost(host: string): string {
  return host === "github.com" ? GITHUB_COM_API_BASE : `https://${host}/api/v3`;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

async function githubFetch<T>(host: string, endpoint: string, init?: RequestInit): Promise<T> {
  const { githubToken } = getPreferences();

  const response = await fetch(`${apiBaseForHost(host)}${endpoint}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `GitHub API request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // ignore body parse errors
    }
    throw new GitHubApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export interface WorkflowRun {
  id: number;
  name: string;
  display_title: string;
  html_url: string;
  status: string;
  conclusion: string | null;
  head_branch: string;
  event: string;
  head_commit: {
    message: string;
  } | null;
  path: string;
  created_at: string;
  run_started_at?: string;
  actor: { login: string } | null;
  triggering_actor: { login: string } | null;
}

interface ListWorkflowRunsResponse {
  workflow_runs: WorkflowRun[];
  total_count: number;
}

export interface ListWorkflowRunsResult {
  runs: WorkflowRun[];
  totalCount: number;
}

export async function listWorkflowRuns(
  host: string,
  owner: string,
  repo: string,
  page = 1,
  perPage = 20,
): Promise<ListWorkflowRunsResult> {
  const data = await githubFetch<ListWorkflowRunsResponse>(
    host,
    `/repos/${owner}/${repo}/actions/runs?per_page=${perPage}&page=${page}`,
  );
  return { runs: data.workflow_runs, totalCount: data.total_count };
}

export async function dispatchWorkflow(
  host: string,
  owner: string,
  repo: string,
  workflowFileName: string,
  ref: string,
  inputs?: Record<string, string>,
): Promise<void> {
  // GitHub's API requires all input values to be strings; stringify defensively in
  // case a caller passes a boolean (e.g. from a Form.Checkbox) instead of a string.
  const stringInputs = inputs
    ? Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, String(value)]))
    : undefined;

  await githubFetch<void>(
    host,
    `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowFileName)}/dispatches`,
    {
      method: "POST",
      body: JSON.stringify({
        ref,
        ...(stringInputs && Object.keys(stringInputs).length > 0 ? { inputs: stringInputs } : {}),
      }),
    },
  );
}
