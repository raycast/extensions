import { GitHubUser } from "./types/pr";

export function getApiUrl(baseUrl: string): string {
  const url = baseUrl.replace(/\/$/, "");
  if (url === "https://github.com" || url === "http://github.com") {
    return "https://api.github.com";
  }
  return `${url}/api/v3`;
}

export async function getAuthenticatedUser(baseUrl: string, token: string): Promise<string> {
  const apiUrl = getApiUrl(baseUrl);
  const response = await fetch(`${apiUrl}/user`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body}`);
  }

  const user = (await response.json()) as GitHubUser;
  return user.login;
}
