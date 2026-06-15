import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import type { Issue } from "../types/api";
import { getMyPullRequests } from "./pull-requests";

vi.mock("../api", () => ({
  api: {
    issues: {
      search: vi.fn(),
    },
  },
}));

const issueApi = vi.mocked(api.issues);

function pullRequest(overrides: Partial<Issue>): Issue {
  return overrides as Issue;
}

describe("pull request services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty page when no pull request categories are enabled", async () => {
    await expect(
      getMyPullRequests({
        includeCreated: false,
        includeAssigned: false,
        includeMentioned: false,
        includeReviewRequested: false,
        includeReviewed: false,
        includeOwnedRepositories: false,
        includeRecentlyClosed: false,
        owner: "alice",
      }),
    ).resolves.toEqual({ items: [], hasMore: false });
    expect(issueApi.search).not.toHaveBeenCalled();
  });

  it("aggregates enabled pull request searches, dedupes by id, and reports hasMore", async () => {
    issueApi.search
      .mockResolvedValueOnce([
        pullRequest({ id: 1, title: "created" }),
        pullRequest({ id: 2, title: "duplicate from created" }),
      ])
      .mockResolvedValueOnce([
        pullRequest({ id: 2, title: "duplicate from review requested" }),
        pullRequest({ id: 3, title: "review requested" }),
      ]);

    await expect(
      getMyPullRequests({
        includeCreated: true,
        includeAssigned: false,
        includeMentioned: false,
        includeReviewRequested: true,
        includeReviewed: false,
        includeOwnedRepositories: false,
        includeRecentlyClosed: false,
        query: "fix",
        page: 2,
        limit: 2,
      }),
    ).resolves.toEqual({
      items: [
        pullRequest({ id: 1, title: "created" }),
        pullRequest({ id: 2, title: "duplicate from review requested" }),
        pullRequest({ id: 3, title: "review requested" }),
      ],
      hasMore: true,
    });

    expect(issueApi.search).toHaveBeenNthCalledWith(1, {
      type: "pulls",
      q: "fix",
      page: 2,
      limit: 2,
      state: "open",
      created: true,
    });
    expect(issueApi.search).toHaveBeenNthCalledWith(2, {
      type: "pulls",
      q: "fix",
      page: 2,
      limit: 2,
      state: "open",
      review_requested: true,
    });
  });

  it("includes recently closed and owned repository searches when requested", async () => {
    issueApi.search.mockResolvedValueOnce([pullRequest({ id: 1, title: "owned" })]);

    await expect(
      getMyPullRequests({
        includeCreated: false,
        includeAssigned: false,
        includeMentioned: false,
        includeReviewRequested: false,
        includeReviewed: false,
        includeOwnedRepositories: true,
        includeRecentlyClosed: true,
        owner: "alice",
        limit: 10,
      }),
    ).resolves.toEqual({
      items: [pullRequest({ id: 1, title: "owned" })],
      hasMore: false,
    });

    expect(issueApi.search).toHaveBeenCalledWith({
      type: "pulls",
      q: undefined,
      page: undefined,
      limit: 10,
      state: "all",
      owner: "alice",
    });
  });
});
