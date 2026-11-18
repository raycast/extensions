import { callGreptileTool } from "./mcp";
import {
  CodeReviewStatus,
  GetCodeReviewResponse,
  ListCodeReviewsResponse,
  ListPullRequestsResponse,
  PaginationInput,
  PullRequestState,
  RepositoryFilter,
  SearchCommentsResponse,
} from "../types";

const MAX_LIST_LIMIT = 100;
const MAX_COMMENT_SEARCH_LIMIT = 50;

type RepositoryInput = RepositoryFilter & PaginationInput;

export type ListPullRequestsInput = RepositoryInput & {
  state?: PullRequestState;
};

export type ListCodeReviewsInput = RepositoryInput & {
  prNumber?: number;
  status?: CodeReviewStatus;
};

export type SearchCommentsInput = PaginationInput & {
  query: string;
  includeAddressed?: boolean;
};

export async function listPullRequests(input: ListPullRequestsInput = {}) {
  return callGreptileTool<ListPullRequestsResponse>(
    "list_pull_requests",
    normalizeListArguments(input),
  );
}

export async function listCodeReviews(input: ListCodeReviewsInput = {}) {
  return callGreptileTool<ListCodeReviewsResponse>(
    "list_code_reviews",
    normalizeListArguments(input),
  );
}

export async function getCodeReview(codeReviewId: string) {
  return callGreptileTool<GetCodeReviewResponse>("get_code_review", {
    codeReviewId,
  });
}

export async function searchComments(input: SearchCommentsInput) {
  return callGreptileTool<SearchCommentsResponse>(
    "search_greptile_comments",
    normalizeSearchCommentsArguments(input),
  );
}

function normalizeListArguments<T extends RepositoryInput>(input: T) {
  const name = input.name?.trim();
  const args: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (
      key === "name" ||
      key === "remote" ||
      key === "defaultBranch" ||
      key === "remoteUrl"
    ) {
      continue;
    }

    const normalizedValue = normalizeArgumentValue(key, value);

    if (normalizedValue !== undefined) {
      args[key] = normalizedValue;
    }
  }

  if (name) {
    args.name = name;

    const remote = normalizeArgumentValue("remote", input.remote);
    const defaultBranch = normalizeArgumentValue(
      "defaultBranch",
      input.defaultBranch,
    );
    const remoteUrl = normalizeArgumentValue("remoteUrl", input.remoteUrl);

    if (remote) {
      args.remote = remote;
    }

    if (defaultBranch) {
      args.defaultBranch = defaultBranch;
    }

    if (remoteUrl) {
      args.remoteUrl = remoteUrl;
    }
  }

  return args;
}

function normalizeArgumentValue(key: string, value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    return trimmedValue || undefined;
  }

  if (typeof value === "number") {
    if (key === "prNumber" && value <= 0) {
      return undefined;
    }

    if (key === "limit" && value <= 0) {
      return undefined;
    }

    if (key === "limit" && value > MAX_LIST_LIMIT) {
      return MAX_LIST_LIMIT;
    }

    if (key === "offset" && value < 0) {
      return undefined;
    }
  }

  return value;
}

function normalizeSearchCommentsArguments(input: SearchCommentsInput) {
  return {
    query: input.query,
    includeAddressed: input.includeAddressed,
    limit: normalizeCommentSearchPaginationValue("limit", input.limit),
    offset: normalizeCommentSearchPaginationValue("offset", input.offset),
  };
}

function normalizeCommentSearchPaginationValue(
  key: "limit" | "offset",
  value?: number,
) {
  if (typeof value !== "number") {
    return undefined;
  }

  if (key === "limit") {
    if (value <= 0) {
      return undefined;
    }

    return Math.min(value, MAX_COMMENT_SEARCH_LIMIT);
  }

  return value < 0 ? undefined : value;
}
