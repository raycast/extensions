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

    /**
     * Appends the pull request to the list of pull requests if it's in some way assigned to us.
     * @param includeCondition If there are no assignees and no reviewers, the pull request is included if we are the author or if this parameter is true. This exists because we want to check the pull requests we authored, but also any pull requests that have been opened on our own repositories, so the flag must be passed in from the outside, depending on the context.
     */
    const extractPR = (pr: PullRequest, includeCondition: boolean) => {
      const author = pr.author.login;
      const assignees = pr.assignees?.nodes.map((assignee) => assignee.login) ?? [];
      const reviewers = pr.reviewRequests?.nodes.map((reviewer) => reviewer.requestedReviewer?.login) ?? [];

      // Skip adding the PR if it's already in the list. This might happen if a PR was authored by us, in one of our own repos or orgs, because `viewer.pullRequests` returns all authored PRs.
      if (pullRequests.find((p) => p.url === pr.url) != null) {
        return;
      }

      if (
        assignees.includes(username) ||
        reviewers.includes(username) ||
        ((author === username || includeCondition) && reviewers.length === 0 && assignees.length === 0)
      ) {
        pullRequests.push(pr);
      }
    };

    viewer.pullRequests?.nodes.forEach((pr) => extractPR(pr, true));

    orgs.forEach((org) => {
      org.repositories.nodes.forEach((repo) => {
        repo.pullRequests.nodes.forEach((pr) => extractPR(pr, ownRepos.includes(repo)));
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
