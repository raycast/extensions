import fetch from "node-fetch";
import { preferences } from "../helpers/preferences";

/**
 * @param key
 * @param start
 * @param repositories
 * @returns
 * @see https://developer.atlassian.com/server/bitbucket/rest/v805/api-group-repository/#api-api-latest-repos-get
 */
export async function getRepositories(key: string, start = 0, repositories = []): Promise<any[]> {
  const data = (await fetch(`${preferences.baseURL}/rest/api/latest/repos?start=${start}&limit=200`, {
    headers: {
      Authorization: `Bearer ${preferences.token}`,
      "Content-Type": "application/json",
    },
  }).then((res) => res.json())) as any;

  repositories = repositories.concat(data.values as []);
  if (data.nextPageStart) {
    return getRepositories(key, data.nextPageStart, repositories);
  }

  return repositories;
}

/**
 * @param repository
 * @param start
 * @param pullRequests
 * @returns
 * @see https://developer.atlassian.com/server/bitbucket/rest/v805/api-group-pull-requests/#api-api-latest-projects-projectkey-repos-repositoryslug-pull-requests-get
 */
export async function pullRequestsGetQuery(
  repository: { project: { key: string }; slug: string },
  start = 0,
  pullRequests = []
): Promise<any[]> {
  const data = (await fetch(
    `${preferences.baseURL}/rest/api/latest/projects/${repository.project.key}/repos/${repository.slug}/pull-requests?avatarSize=64&order=newest&state=OPEN&start=${start}`,
    {
      headers: {
        Authorization: `Bearer ${preferences.token}`,
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json())) as any;

  pullRequests = pullRequests.concat(data.values as []);
  if (data.nextPageStart) {
    return pullRequestsGetQuery(repository, data.nextPageStart, pullRequests);
  }

  return pullRequests;
}

/**
 * @param start
 * @param pullRequests
 * @returns
 * @see https://developer.atlassian.com/server/bitbucket/rest/v805/api-group-dashboard/#api-api-latest-dashboard-pull-requests-get
 */
export async function getMyOpenPullRequests(start = 0, pullRequests = []): Promise<any[]> {
  const data = (await fetch(
    `${preferences.baseURL}/rest/api/latest/dashboard/pull-requests?state=OPEN&start=${start}`,
    {
      headers: {
        Authorization: `Bearer ${preferences.token}`,
        "Content-Type": "application/json",
      },
    }
  ).then((res) => res.json())) as any;

  pullRequests = pullRequests.concat(data.values as []);
  if (data.nextPageStart) {
    return getMyOpenPullRequests(data.nextPageStart, pullRequests);
  }

  return pullRequests;
}
