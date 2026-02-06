import { getAccessToken } from "@raycast/utils";
import { getOctokit } from "../lib/oauth";
import { handleGitHubError } from "../lib/github-client";
import { parseUsageData } from "../tools/parse-copilot-usage";

type AssignIssueToCopilotOptions = {
  issueId: string;
  repositoryId: string;
  copilotBotId: string;
  baseRef?: string;
  customAgent?: string;
  model?: string;
  additionalInstructions?: string;
};

type AssignIssueToCopilotResult = {
  issueId: string;
};

// Task artifact from Copilot API
type TaskArtifact = {
  provider: string;
  data: {
    id: number;
    type: "pull";
    global_id: string;
  };
};

// Task collaborator from Copilot API
type TaskCollaborator = {
  agent_type: string;
  agent_id: number;
  agent_task_id: string;
};

// A task returned from Copilot API
type Task = {
  id: string;
  name: string | null;
  creator_id: number;
  user_collaborators: number[];
  agent_collaborators: TaskCollaborator[];
  owner_id: number;
  repo_id: number;
  status: string;
  session_count: number;
  artifacts: TaskArtifact[];
  archived_at: string | null;
  last_updated_at: string;
  created_at: string;
};

// Response from listing tasks
type ListTasksResponse = {
  tasks: Task[];
  has_next_page: boolean;
};

// Response from creating a task
type CreateTaskResponse = {
  task: Task;
};

// A pull request returned from the GitHub GraphQL API
type PullRequest = {
  globalId: string;
  title: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  url: string;
  repository: {
    name: string;
    owner: {
      login: string;
    };
  };
};

type Repository = {
  name: string;
  owner: {
    login: string;
  };
};

// A task with associated pull request info (for display)
type TaskWithPullRequest = {
  task: Task;
  pullRequest: PullRequest | null;
  repository: Repository | null;
  key: string;
};

type QuotaSnapshot = {
  entitlement: number;
  overage_count: number;
  overage_permitted: boolean;
  percent_remaining: number;
  quota_id: string;
  quota_remaining: number;
  remaining: number;
  unlimited: boolean;
  timestamp_utc: string;
};

type CopilotInternalUserResponse = {
  access_type_sku: string;
  analytics_tracking_id: string;
  assigned_date: string;
  can_signup_for_limited: boolean;
  chat_enabled: boolean;
  copilot_plan: string;
  organization_login_list: string[];
  organization_list: Array<{
    login: string;
    name: string;
  }>;
  quota_reset_date: string;
  quota_snapshots: {
    chat?: QuotaSnapshot;
    completions?: QuotaSnapshot;
    premium_interactions?: QuotaSnapshot;
  };
  quota_reset_date_utc: string;
};

type CopilotUsage = {
  inlineSuggestions: {
    percentageUsed: number;
    limit: number | null;
  };
  chatMessages: {
    percentageUsed: number;
    limit: number | null;
  };
  premiumRequests: {
    percentageUsed: number;
    limit: number | null;
  };
  allowanceResetAt: string;
};

async function createTask(
  repository: string,
  prompt: string,
  branch: string,
  model: string | null,
  customAgent: string | null,
): Promise<{ taskUrl: string }> {
  const { token } = getAccessToken();

  // Parse repository into owner and repo name
  const [ownerName, repoName] = repository.split("/");

  const body: {
    problem_statement: string;
    create_pull_request: boolean;
    base_ref: string;
    model?: string;
    custom_agent?: string;
  } = {
    problem_statement: prompt,
    create_pull_request: true,
    base_ref: branch,
  };

  if (model) {
    body.model = model;
  }

  if (customAgent) {
    body.custom_agent = customAgent;
  }

  const createTaskResponse = await fetch(`https://api.githubcopilot.com/agents/repos/${ownerName}/${repoName}/tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Copilot-Integration-Id": "copilot-raycast",
    },
    body: JSON.stringify(body),
  });

  if (!createTaskResponse.ok) {
    if (createTaskResponse.status === 403) {
      throw new Error(
        "Failed to create task. Please check if Copilot coding agent is enabled for your user at https://github.com/settings/copilot/features.",
      );
    } else {
      const errorText = await createTaskResponse.text();
      throw new Error(`Failed to create task (${createTaskResponse.statusText}): ${errorText}`);
    }
  }

  const createTaskResult = (await createTaskResponse.json()) as CreateTaskResponse;

  // URL format: https://github.com/{owner}/{repo}/tasks/{task_id}
  const taskUrl = `https://github.com/${ownerName}/${repoName}/tasks/${createTaskResult.task.id}`;

  return { taskUrl };
}

const fetchTasks = async (): Promise<TaskWithPullRequest[]> => {
  const { token } = getAccessToken();

  const listTasksResponse = await fetch("https://api.githubcopilot.com/agents/tasks?sort=last_updated_at,desc", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Copilot-Integration-Id": "copilot-raycast",
    },
  });

  if (!listTasksResponse.ok) {
    const responseText = await listTasksResponse.text();
    throw new Error(
      `Unexpected ${listTasksResponse.status} ${listTasksResponse.statusText} error when fetching tasks: ${responseText}`,
    );
  }

  const { tasks: retrievedTasks } = (await listTasksResponse.json()) as ListTasksResponse;

  // Extract pull request global IDs from task artifacts
  const pullRequestGlobalIds = Array.from(
    new Set(
      retrievedTasks
        .flatMap((task) => task.artifacts)
        .filter((artifact) => artifact.data.type === "pull")
        .map((artifact) => artifact.data.global_id),
    ),
  );

  const octokit = getOctokit();

  const pullRequestResults = await Promise.allSettled(
    pullRequestGlobalIds.map(async (globalId) => {
      try {
        const data = await octokit.graphql<{ node: PullRequest }>(`
          query {
            node(id: "${globalId}") {
              ... on PullRequest {
                title
                state
                url
                repository {
                  name
                  owner {
                    login
                  }
                }
              }
            }
          }
        `);
        return {
          globalId,
          title: data.node.title,
          state: data.node.state,
          url: data.node.url,
          repository: data.node.repository,
        };
      } catch (error) {
        throw handleGitHubError(error);
      }
    }),
  );

  // Filter out failed pull request fetches and extract successful ones
  const pullRequests = pullRequestResults
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  // Fetch repository info for tasks without pull requests
  const tasksWithoutPRs = retrievedTasks.filter(
    (task) => !task.artifacts.some((artifact) => artifact.data.type === "pull"),
  );
  const uniqueRepoIds = Array.from(new Set(tasksWithoutPRs.map((task) => task.repo_id)));

  const repoResults = await Promise.allSettled(
    uniqueRepoIds.map(async (repoId) => {
      const response = await octokit.request("GET /repositories/{id}", { id: repoId });
      return {
        repoId,
        name: response.data.name,
        owner: { login: response.data.owner.login },
      };
    }),
  );

  const repositories = repoResults.filter((result) => result.status === "fulfilled").map((result) => result.value);

  // Transform tasks into TaskWithPullRequest format
  const tasksWithPullRequests: TaskWithPullRequest[] = retrievedTasks.map((task) => {
    // Find the first pull request artifact for this task
    const pullArtifact = task.artifacts.find((artifact) => artifact.data.type === "pull");
    const pullRequest = pullArtifact
      ? pullRequests.find((pr) => pr.globalId === pullArtifact.data.global_id) || null
      : null;

    const repository = pullRequest?.repository ?? repositories.find((r) => r.repoId === task.repo_id) ?? null;

    return {
      task,
      pullRequest,
      repository,
      key: task.id,
    };
  });

  return tasksWithPullRequests;
};

const fetchCopilotUsage = async (): Promise<CopilotUsage> => {
  const { token } = getAccessToken();

  const response = await fetch("https://api.github.com/copilot_internal/user", {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Copilot usage: ${response.status} ${response.statusText}`);
  }

  const data = JSON.parse(await response.text()) as CopilotInternalUserResponse;
  return parseUsageData(data);
};

const ASSIGN_ISSUE_MUTATION = `
  mutation AssignIssueToCopilot($issueId: ID!, $repositoryId: ID!, $copilotBotId: ID!, $baseRef: String, $customAgent: String, $model: String, $customInstructions: String) {
    updateIssue(input: {
      id: $issueId,
      assigneeIds: [$copilotBotId],
      agentAssignment: {
        targetRepositoryId: $repositoryId,
        baseRef: $baseRef,
        customAgent: $customAgent,
        model: $model,
        customInstructions: $customInstructions
      }
    }) {
      issue {
        id
      }
    }
  }
`;

async function assignIssueToCopilot(options: AssignIssueToCopilotOptions): Promise<AssignIssueToCopilotResult> {
  const octokit = getOctokit();

  try {
    const response = await octokit.graphql<{ updateIssue: { issue: { id: string } } }>(ASSIGN_ISSUE_MUTATION, {
      issueId: options.issueId,
      repositoryId: options.repositoryId,
      copilotBotId: options.copilotBotId,
      baseRef: options.baseRef || "main",
      customAgent: options.customAgent || null,
      model: options.model || null,
      customInstructions: options.additionalInstructions || null,
      headers: {
        "GraphQL-Features": "issues_copilot_assignment_api_support,coding_agent_model_selection",
      },
    });

    return { issueId: response.updateIssue.issue.id };
  } catch (error) {
    throw handleGitHubError(error);
  }
}

export {
  createTask,
  fetchTasks,
  fetchCopilotUsage,
  assignIssueToCopilot,
  type Task,
  type TaskWithPullRequest,
  type CopilotUsage,
  type CopilotInternalUserResponse,
  type QuotaSnapshot,
  type AssignIssueToCopilotOptions,
};
