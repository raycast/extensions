import { useCachedPromise } from "@raycast/utils";
import { githubGraphql } from "./client";
import { SEARCH_PULL_REQUESTS, SEARCH_REVIEW_REQUESTS } from "./queries";
import { PullRequestNode } from "./types";
import { mapPullRequest } from "../lib/mapPullRequest";

interface SearchData {
  viewer: { login: string };
  search: { nodes: PullRequestNode[] };
}

interface ReviewSearchData {
  viewer: { login: string };
  pending: { nodes: PullRequestNode[] };
  closed: { nodes: PullRequestNode[] };
}

export function usePullRequestSearch(searchQuery: string) {
  return useCachedPromise(
    async (query: string) => {
      const data = await githubGraphql<SearchData>(SEARCH_PULL_REQUESTS, {
        searchQuery: query,
      });
      return {
        viewerLogin: data.viewer.login,
        pullRequests: data.search.nodes.map((node) =>
          mapPullRequest(node, data.viewer.login),
        ),
      };
    },
    [searchQuery],
    { keepPreviousData: true },
  );
}

export function useReviewRequests(pendingQuery: string, closedQuery: string) {
  return useCachedPromise(
    async (pending: string, closed: string) => {
      const data = await githubGraphql<ReviewSearchData>(
        SEARCH_REVIEW_REQUESTS,
        {
          pendingQuery: pending,
          closedQuery: closed,
        },
      );
      const map = (nodes: PullRequestNode[]) =>
        nodes.map((node) => mapPullRequest(node, data.viewer.login));
      return {
        viewerLogin: data.viewer.login,
        pending: map(data.pending.nodes),
        closed: map(data.closed.nodes),
      };
    },
    [pendingQuery, closedQuery],
    { keepPreviousData: true },
  );
}
