import { getAccessToken } from "@raycast/utils";

export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function githubGraphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const { token } = getAccessToken();
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new GitHubError(
      `GitHub API error ${response.status}: ${response.statusText}`,
      response.status,
    );
  }
  const json = (await response.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new GitHubError(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new GitHubError("GitHub returned an empty response");
  }
  return json.data;
}
