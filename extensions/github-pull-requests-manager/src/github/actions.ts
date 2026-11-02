import { getApiUrl } from "./auth";

export async function approvePullRequest(
  baseUrl: string,
  token: string,
  repoFullName: string,
  prNumber: number,
): Promise<void> {
  const apiUrl = getApiUrl(baseUrl);
  const response = await fetch(`${apiUrl}/repos/${repoFullName}/pulls/${prNumber}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event: "APPROVE" }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body}`);
  }
}

export async function requestChanges(
  baseUrl: string,
  token: string,
  repoFullName: string,
  prNumber: number,
  body: string,
): Promise<void> {
  const apiUrl = getApiUrl(baseUrl);
  const response = await fetch(`${apiUrl}/repos/${repoFullName}/pulls/${prNumber}/reviews`, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event: "REQUEST_CHANGES", body }),
  });

  if (!response.ok) {
    const body_text = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body_text}`);
  }
}
