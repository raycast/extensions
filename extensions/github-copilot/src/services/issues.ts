import { getOctokit } from "../lib/oauth";
import { handleGitHubError } from "../lib/github-client";

export type Issue = {
  id: string;
  number: number;
  title: string;
};

type IssuesQueryResponse = {
  repository: {
    id: string;
    suggestedActors: {
      nodes: {
        __typename: string;
        login: string;
        id?: string;
      }[];
    };
    issues: {
      nodes: {
        id: string;
        number: number;
        title: string;
      }[];
    };
  };
};

const ISSUES_QUERY = `
  query GetRepositoryIssues($owner: String!, $name: String!, $first: Int!) {
    repository(owner: $owner, name: $name) {
      id
      suggestedActors(first: 100, capabilities: [CAN_BE_ASSIGNED]) {
        nodes {
          __typename
          login
          ... on Bot {
            id
          }
        }
      }
      issues(first: $first, states: [OPEN], orderBy: {field: UPDATED_AT, direction: DESC}) {
        nodes {
          id
          number
          title
        }
      }
    }
  }
`;

export async function fetchOpenIssues(
  nwo: string,
): Promise<{ issues: Issue[]; repositoryId: string; copilotBotId: string | null }> {
  const [owner, name] = nwo.split("/");
  const octokit = getOctokit();

  try {
    const response = await octokit.graphql<IssuesQueryResponse>(ISSUES_QUERY, {
      owner,
      name,
      first: 100,
      headers: {
        "GraphQL-Features": "issues_copilot_assignment_api_support,coding_agent_model_selection",
      },
    });

    const copilotBot = response.repository.suggestedActors.nodes.find(
      (actor) => actor.__typename === "Bot" && actor.login === "copilot-swe-agent" && actor.id,
    );

    return {
      issues: response.repository.issues.nodes,
      repositoryId: response.repository.id,
      copilotBotId: copilotBot?.id || null,
    };
  } catch (error) {
    throw handleGitHubError(error);
  }
}

type SearchIssuesResponse = {
  search: {
    nodes: {
      id: string;
      number: number;
      title: string;
    }[];
  };
};

const SEARCH_ISSUES_QUERY = `
  query SearchIssues($searchQuery: String!) {
    search(query: $searchQuery, type: ISSUE, first: 100) {
      nodes {
        ... on Issue {
          id
          number
          title
        }
      }
    }
  }
`;

export async function searchIssues(nwo: string, searchText: string): Promise<Issue[]> {
  const octokit = getOctokit();

  try {
    const response = await octokit.graphql<SearchIssuesResponse>(SEARCH_ISSUES_QUERY, {
      searchQuery: `repo:${nwo} is:issue is:open ${searchText}`,
    });

    return response.search.nodes.filter((node) => node.id);
  } catch (error) {
    throw handleGitHubError(error);
  }
}
