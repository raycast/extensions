import { encode } from "@msgpack/msgpack";
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

type CreateTaskResponse = {
  pull_request: {
    html_url: string;
  };
};

// Generates a global ID for a pull request based on its ID and repository ID.
// This implementation is NOT safe or guaranteed to work - but it does at the
// moment and allows us to overcome the fact that Copilot API only returns
// integer pull request IDs.
const unsafelyGetGlobalIdForPullRequest = (pullRequestId: number, repoId: number): string => {
  const encoded: Uint8Array = encode([0, repoId, pullRequestId]);
  return "PR_" + Buffer.from(encoded).toString("base64");
};

export async function createTask(repository: string, prompt: string, branch: string) {
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

  const response = await fetch(`https://api.githubcopilot.com/agents/swe/jobs/${repository}`, {
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

  if (!response.ok) {
    throw new Error(`Failed to create task: ${response.statusText}`);
  }

  return (await response.json()) as CreateTaskResponse;
}

export const fetchSessions = async (): Promise<
  {
    sessions: AgentSession[];
    key: string;
    pullRequest: {
      id: number;
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
  }[]
> => {
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

  const pullRequestIdAndRepoIdPairs = retrievedSessions
    .filter((session) => session.resource_type === "pull")
    .map((session) => ({
      pullRequestId: session.resource_id,
      repoId: session.repo_id,
    }));

  const uniquePullRequestIdAndRepoIdPairs = Array.from(
    new Map(pullRequestIdAndRepoIdPairs.map((pair) => [`${pair.pullRequestId}-${pair.repoId}`, pair])).values(),
  );

  const octokit = getOctokit();

  const pullRequests = await Promise.all(
    uniquePullRequestIdAndRepoIdPairs.map(async ({ pullRequestId, repoId }) => {
      const globalId = unsafelyGetGlobalIdForPullRequest(pullRequestId, repoId);

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
          id: pullRequestId,
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

  const sessionsByResourceId = retrievedSessions.reduce((acc: Record<number, AgentSession[]>, session) => {
    if (session.resource_type !== "pull") return acc;

    const key = session.resource_id;

    if (acc[key]) {
      acc[key] = acc[key].concat(session);
    } else {
      acc[key] = [session];
    }

    return acc;
  }, {});

  const transformedPullRequestsWithAgentSessions = Object.entries(sessionsByResourceId)
    .map(([resourceId, retrievedSessions]) => {
      const sortedSessions = retrievedSessions.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const lastUpdatedSession = sortedSessions[0];
      const pullRequest = pullRequests.find((pullRequest) => pullRequest.id.toString() === resourceId);

      if (!pullRequest) {
        throw new Error(`Pull request not found for session ${lastUpdatedSession.id}`);
      }

      return {
        sessions: sortedSessions,
        key: lastUpdatedSession.id,
        pullRequest,
      };
    })
    .sort((a, b) => new Date(b.sessions[0].created_at).getTime() - new Date(a.sessions[0].created_at).getTime());

  return transformedPullRequestsWithAgentSessions;
};

// Export types for use in other files
export type { AgentSession, PullRequest, PullRequestWithAgentSessions, CreateTaskResponse };
export { AgentSessionState };
