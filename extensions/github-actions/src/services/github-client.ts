import { parse } from "yaml";
import { GitHubRequestError } from "../lib/errors";
import type {
  DispatchableWorkflow,
  GitHubJob,
  GitHubRepository,
  GitHubWorkflow,
  GitHubWorkflowRun,
  WorkflowDispatchInput,
} from "../types/github";

export class WorkflowInspectionError extends Error {
  constructor(
    message: string,
    readonly workflowName: string,
  ) {
    super(message);
    this.name = "WorkflowInspectionError";
  }
}

type RequestInitLike = {
  method?: string;
  body?: string;
};

interface RepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch: string;
  updated_at: string;
  owner: { login: string };
}

interface WorkflowResponse {
  id: number;
  name: string;
  path: string;
  state: string;
  html_url: string;
}

interface WorkflowRunResponse {
  id: number;
  name: string;
  display_title: string;
  event: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  head_branch: string;
  run_started_at: string | null;
  updated_at: string;
  workflow_id: number;
  actor: { login: string } | null;
}

interface JobResponse {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
}

interface ContentsResponse {
  content: string;
  encoding: string;
}

function encodeRepositoryPath(repoFullName: string): string {
  return repoFullName
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function mapRepository(repo: RepositoryResponse): GitHubRepository {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    htmlUrl: repo.html_url,
    private: repo.private,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at,
  };
}

function mapWorkflow(workflow: WorkflowResponse): GitHubWorkflow {
  return {
    id: workflow.id,
    name: workflow.name,
    path: workflow.path,
    state: workflow.state,
    htmlUrl: workflow.html_url,
  };
}

function mapRun(run: WorkflowRunResponse, workflowName?: string): GitHubWorkflowRun {
  return {
    id: run.id,
    name: run.name,
    displayTitle: run.display_title,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
    headBranch: run.head_branch,
    runStartedAt: run.run_started_at,
    updatedAt: run.updated_at,
    actor: run.actor ? { login: run.actor.login } : null,
    workflowId: run.workflow_id,
    workflowName: workflowName || run.name || `Workflow #${run.workflow_id}`,
  };
}

function mapJob(job: JobResponse): GitHubJob {
  return {
    id: job.id,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    htmlUrl: job.html_url,
  };
}

function isRepositoryWorkflowPath(path: string): boolean {
  return path.startsWith(".github/workflows/") && (path.endsWith(".yml") || path.endsWith(".yaml"));
}

function parseWorkflowDispatchInputs(document: unknown): WorkflowDispatchInput[] | null {
  if (!document || typeof document !== "object") {
    return null;
  }

  const root = document as Record<string, unknown>;
  const onSection = root.on ?? root["true"];
  if (!onSection) {
    return null;
  }

  if (typeof onSection === "string") {
    return onSection === "workflow_dispatch" ? [] : null;
  }

  if (Array.isArray(onSection)) {
    return onSection.includes("workflow_dispatch") ? [] : null;
  }

  if (typeof onSection !== "object") {
    return null;
  }

  const workflowDispatch = (onSection as Record<string, unknown>).workflow_dispatch;
  if (workflowDispatch === undefined) {
    return null;
  }

  if (!workflowDispatch || typeof workflowDispatch !== "object") {
    return [];
  }

  const inputs = (workflowDispatch as Record<string, unknown>).inputs;
  if (!inputs || typeof inputs !== "object") {
    return [];
  }

  return Object.entries(inputs as Record<string, Record<string, unknown>>).map(([name, value]) => {
    const rawType = typeof value.type === "string" ? value.type : "string";
    const type = ["choice", "boolean", "environment"].includes(rawType) ? rawType : "string";

    return {
      name,
      description: typeof value.description === "string" ? value.description : undefined,
      required: Boolean(value.required),
      defaultValue: value.default != null ? String(value.default) : undefined,
      type: type as WorkflowDispatchInput["type"],
      options: Array.isArray(value.options) ? value.options.map(String) : undefined,
    };
  });
}

export class GitHubClient {
  constructor(private readonly token: string) {}

  private async request<T>(path: string, init?: RequestInitLike): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`https://api.github.com${path}`, {
        method: init?.method ?? "GET",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${this.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
        },
        body: init?.body,
      });
    } catch {
      throw new GitHubRequestError("Network error while contacting GitHub.");
    }

    if (!response.ok) {
      let message = `GitHub request failed with status ${response.status}.`;

      if (response.status === 401) {
        message = "GitHub token is invalid. Update your token in Raycast preferences.";
      } else if (response.status === 403) {
        message = "GitHub token does not have enough permission for this action.";
      } else if (response.status === 404) {
        message = "GitHub resource not found, or your token cannot access it.";
      } else if (response.status === 422) {
        message = "GitHub rejected this action because the workflow state does not allow it.";
      }

      throw new GitHubRequestError(message, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async listRepositories(): Promise<GitHubRepository[]> {
    const response = await this.request<RepositoryResponse[]>(
      "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
    );
    return response.map(mapRepository);
  }

  async listWorkflows(repoFullName: string): Promise<GitHubWorkflow[]> {
    const response = await this.request<{ workflows: WorkflowResponse[] }>(
      `/repos/${encodeRepositoryPath(repoFullName)}/actions/workflows?per_page=100`,
    );
    return response.workflows.map(mapWorkflow);
  }

  async listWorkflowRuns(repoFullName: string): Promise<GitHubWorkflowRun[]> {
    const [runsResponse, workflows] = await Promise.all([
      this.request<{ workflow_runs: WorkflowRunResponse[] }>(
        `/repos/${encodeRepositoryPath(repoFullName)}/actions/runs?per_page=25`,
      ),
      this.listWorkflows(repoFullName),
    ]);

    const workflowMap = new Map(workflows.map((workflow) => [workflow.id, workflow.name]));
    return runsResponse.workflow_runs.map((run) => mapRun(run, workflowMap.get(run.workflow_id)));
  }

  async listRunJobs(repoFullName: string, runId: number): Promise<GitHubJob[]> {
    const response = await this.request<{ jobs: JobResponse[] }>(
      `/repos/${encodeRepositoryPath(repoFullName)}/actions/runs/${runId}/jobs?per_page=100`,
    );
    return response.jobs.map(mapJob);
  }

  async rerunWorkflow(repoFullName: string, runId: number): Promise<void> {
    await this.request<void>(`/repos/${encodeRepositoryPath(repoFullName)}/actions/runs/${runId}/rerun`, {
      method: "POST",
    });
  }

  async rerunFailedJobs(repoFullName: string, runId: number): Promise<void> {
    await this.request<void>(`/repos/${encodeRepositoryPath(repoFullName)}/actions/runs/${runId}/rerun-failed-jobs`, {
      method: "POST",
    });
  }

  async cancelRun(repoFullName: string, runId: number): Promise<void> {
    await this.request<void>(`/repos/${encodeRepositoryPath(repoFullName)}/actions/runs/${runId}/cancel`, {
      method: "POST",
    });
  }

  async getDispatchableWorkflows(repoFullName: string, ref?: string): Promise<DispatchableWorkflow[]> {
    const workflows = await this.listWorkflows(repoFullName);
    const workflowResults = await Promise.all(
      workflows.map(async (workflow) => {
        if (!isRepositoryWorkflowPath(workflow.path)) {
          return null;
        }

        let inputs: WorkflowDispatchInput[] | null;

        try {
          inputs = await this.getWorkflowDispatchInputs(repoFullName, workflow.path, ref);
        } catch (error) {
          if (error instanceof GitHubRequestError && error.statusCode === 404) {
            return null;
          }

          if (error instanceof Error) {
            throw new WorkflowInspectionError(error.message, workflow.name);
          }

          throw new WorkflowInspectionError("Failed to inspect workflow file.", workflow.name);
        }

        return inputs ? { ...workflow, inputs } : null;
      }),
    );

    return workflowResults.filter((workflow): workflow is DispatchableWorkflow => workflow !== null);
  }

  async dispatchWorkflow(
    repoFullName: string,
    workflowId: number,
    payload: { ref: string; inputs: Record<string, string> },
  ): Promise<void> {
    await this.request<void>(
      `/repos/${encodeRepositoryPath(repoFullName)}/actions/workflows/${workflowId}/dispatches`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }

  private async getWorkflowDispatchInputs(
    repoFullName: string,
    workflowPath: string,
    ref?: string,
  ): Promise<WorkflowDispatchInput[] | null> {
    const encodedPath = workflowPath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    const response = await this.request<ContentsResponse>(
      `/repos/${encodeRepositoryPath(repoFullName)}/contents/${encodedPath}${query}`,
    );

    if (response.encoding !== "base64") {
      return null;
    }

    const content = Buffer.from(response.content, "base64").toString("utf8");
    const parsed = parse(content) as unknown;
    return parseWorkflowDispatchInputs(parsed);
  }
}
