import { preferences, showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import query from "./query";
import { PullRequest, DataJson } from "./types";

async function fetchPullRequests(): Promise<PullRequest[]> {
  const token = preferences.accessToken.value as string | undefined;
  const username = preferences.username.value as string | undefined;

  if (token == null || username == null) {
    return [];
  }

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      body: `{ "query": "${query}" }`,
      headers: { Authorization: `token ${token}` },
    });
    const json = (await response.json()) as DataJson;
    const viewer = json.data.viewer;
    const ownRepos = viewer.repositories?.nodes ?? [];
    const orgs = viewer.organizations?.nodes ?? [];
    const pullRequests: PullRequest[] = [];

    orgs.forEach((org) => {
      org.repositories.nodes.forEach((repo) => {
        repo.pullRequests.nodes.forEach((pr) => {
          const author = pr.author.login;
          const assignees = pr.assignees?.nodes.map((assignee) => assignee.login) ?? [];
          const reviewers = pr.reviewRequests?.nodes.map((reviewer) => reviewer.requestedReviewer?.login) ?? [];

          if (
            assignees.includes(username) ||
            reviewers.includes(username) ||
            ((author === username || ownRepos.includes(repo)) && reviewers.length === 0 && assignees.length === 0)
          ) {
            pullRequests.push(pr);
          }
        });
      });
    });

    return pullRequests as PullRequest[];
  } catch (error) {
    console.error(error);

    showToast(ToastStyle.Failure, "Could not load Pull Requests");

    return Promise.resolve([]);
  }
}

export default fetchPullRequests;
