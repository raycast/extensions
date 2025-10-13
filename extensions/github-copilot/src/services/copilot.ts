import { getAccessToken } from "@raycast/utils";
import { getOctokit } from "../lib/oauth";
import { handleGitHubError } from "../lib/github-client";
import { AI, environment } from "@raycast/api";

// The state of an agent session returned from Copilot API
enum AgentSessionState {
  QUEUED = "queued",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  TIMED_OUT = "timed_out",
  CANCELLED = "cancelled",
}

// An agent session returned from Copilot API
type AgentSession = {
  id: string;
  name: string;
  user_id: number;
  agent_id: number;
  logs: "";
  logs_blob_id: string;
  state: AgentSessionState;
  owner_id: number;
  repo_id: number;
  resource_type: "pull";
  resource_global_id: string;
  resource_id: number;
  last_updated_at: string;
  created_at: string;
  completed_at: string | null;
  event_type: string;
  event_identifiers: string[];
  workflow_run_id: number;
  premium_requests: number;
  error: {
    message: string;
  } | null;
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

// A pull request with one or more associated agent sessions
type PullRequestWithAgentSessions = {
  sessions: AgentSession[];
  pullRequest: PullRequest;
  key: string;
};

// The response from Copilot API for listing agent sessions
type ListAgentSessionsResponse = {
  sessions: AgentSession[];
};

type CreateJobResponse = {
  job_id: string;
  session_id: string;
  actor: {
    id: number;
    login: string;
  };
  created_at: string;
  updated_at: string;
};

type GetJobResponse =
  | {
      status: "pending";
      error?: {
        message: string;
        response_status_code: string;
      };
    }
  | {
      status: "queued";
      pull_request: {
        id: number;
        number: number;
      };
    };

export async function createTask(
  repository: string,
  prompt: string,
  branch: string,
): Promise<{ pullRequestUrl: string }> {
  const { token } = getAccessToken();

  let generatedTitle: string | null = null;
  if (environment.canAccess(AI)) {
    try {
      generatedTitle = await AI.ask(`
        You are a helpful assistant that generates a title for a pull request.
        The user kicked off a new agent with the following prompt:
        <prompt>
        ${prompt}
        </prompt>

        Return only the title of the pull request that describes the intent of the user in the prompt. 
        Keep it short and concise so it can be used as a pull request title on GitHub.
      `);
    } catch (error) {
      console.error(error);
    }
  }

  const createJobResponse = await fetch(`https://api.githubcopilot.com/agents/swe/v1/jobs/${repository}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      problem_statement: prompt,
      event_type: "raycast",
      pull_request: {
        title: generatedTitle ?? prompt,
        base_ref: branch,
        head_ref: null,
      },
    }),
  });

  if (!createJobResponse.ok) {
    if (createJobResponse.status === 403) {
      throw new Error(
        "Failed to create task. Please check if Copilot coding agent is enabled for your user at https://github.com/settings/copilot/features.",
      );
    } else {
      throw new Error(`Failed to create task: ${createJobResponse.statusText}`);
    }
  }

  const createJobResult = (await createJobResponse.json()) as CreateJobResponse;
  return { pullRequestUrl: await pollJobUntilPullRequestUrlReady({ repository, jobId: createJobResult.job_id }) };
}

const pollJobUntilPullRequestUrlReady = async ({
  repository,
  jobId,
}: {
  repository: string;
  jobId: string;
}): Promise<string> => {
  const { token } = getAccessToken();

  const getJobResponse = await fetch(`https://api.githubcopilot.com/agents/swe/v1/jobs/${repository}/${jobId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!getJobResponse.ok) {
    throw new Error(`Failed to get job status: ${getJobResponse.statusText}`);
  }

  const getJobResult = (await getJobResponse.json()) as GetJobResponse;

  if (getJobResult.status !== "pending") {
    const pullRequestUrl = `https://github.com/${repository}/pull/${getJobResult.pull_request.number}`;
    return pullRequestUrl;
  } else if (getJobResult.error) {
    if (getJobResult.error.response_status_code === "422") {
      throw new Error(
        "Failed to create task. Copilot is unable to work in your repository due to rules or branch protections. You can resolve this error by excluding branches starting with `copilot/` from policies configured.",
      );
    } else {
      throw new Error(`Failed to create task: ${getJobResponse.statusText}`);
    }
  } else {
    await sleep(1_000);
    return pollJobUntilPullRequestUrlReady({ repository, jobId });
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchSessions = async (): Promise<PullRequestWithAgentSessions[]> => {
  const { token } = getAccessToken();

  const listSessionsResponse = await fetch("https://api.githubcopilot.com/agents/sessions", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Copilot-Integration-Id": "copilot-raycast",
    },
  });

  if (!listSessionsResponse.ok) {
    const responseText = await listSessionsResponse.text();
    throw new Error(
      `Unexpected ${listSessionsResponse.status} ${listSessionsResponse.statusText} error when fetching sessions: ${responseText}`,
    );
  }

  const { sessions: retrievedSessions } = (await listSessionsResponse.json()) as ListAgentSessionsResponse;

  const pullRequestGlobalIds = Array.from(
    new Set(
      retrievedSessions
        .filter((session) => session.resource_type === "pull")
        .map((session) => session.resource_global_id),
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

  const sessionsByGlobalId = retrievedSessions.reduce((acc: Record<string, AgentSession[]>, session) => {
    if (session.resource_type !== "pull") return acc;

    const key = session.resource_global_id;

    if (acc[key]) {
      acc[key] = acc[key].concat(session);
    } else {
      acc[key] = [session];
    }

    return acc;
  }, {});

  const transformedPullRequestsWithAgentSessions = Object.entries(sessionsByGlobalId)
    .map(([globalId, retrievedSessions]) => {
      const sortedSessions = retrievedSessions.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const lastUpdatedSession = sortedSessions[0];
      const pullRequest = pullRequests.find((pullRequest) => pullRequest.globalId.toString() === globalId);

      // If pull request couldn't be resolved, skip this session group silently
      if (!pullRequest) {
        return null;
      }

      return {
        sessions: sortedSessions,
        key: lastUpdatedSession.id,
        pullRequest,
      };
    })
    .filter((item) => item !== null)
    .sort((a, b) => new Date(b.sessions[0].created_at).getTime() - new Date(a.sessions[0].created_at).getTime());

  return transformedPullRequestsWithAgentSessions;
};

// Export types for use in other files
export type { AgentSession, PullRequest, PullRequestWithAgentSessions };
export { AgentSessionState };
