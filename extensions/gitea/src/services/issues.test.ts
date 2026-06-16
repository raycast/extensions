import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import type { Issue, Label, Milestone, User } from "../types/api";
import { getCreateIssueMetadata, getMyIssues, searchIssues } from "./issues";

vi.mock("../api", () => ({
  api: {
    issues: {
      create: vi.fn(),
      listAssignees: vi.fn(),
      listLabels: vi.fn(),
      listMilestones: vi.fn(),
      listRepo: vi.fn(),
      search: vi.fn(),
    },
  },
}));

const issueApi = vi.mocked(api.issues);

function issue(overrides: Partial<Issue>): Issue {
  return overrides as Issue;
}

describe("issue services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searches repository issues with the repository issue listing endpoint", async () => {
    issueApi.listRepo.mockResolvedValue([
      issue({ id: 1, repository: { full_name: "alice/app" } }),
      issue({ id: 2, repository: { full_name: "alice/app" } }),
    ]);

    await expect(searchIssues({ owner: "alice", repo: "app", query: "bug", state: "open" })).resolves.toEqual({
      items: [
        issue({ id: 1, repository: { full_name: "alice/app" } }),
        issue({ id: 2, repository: { full_name: "alice/app" } }),
      ],
      hasMore: false,
    });
    expect(issueApi.listRepo).toHaveBeenCalledWith({
      owner: "alice",
      repo: "app",
      state: "open",
      q: "bug",
      page: undefined,
      limit: undefined,
    });
    expect(issueApi.search).not.toHaveBeenCalled();
  });

  it("does not filter repository searches to the first owner search page", async () => {
    issueApi.listRepo.mockResolvedValue([issue({ id: 1, repository: { full_name: "alice/app" } })]);

    await expect(searchIssues({ owner: "alice", repo: "app", page: 2, limit: 1 })).resolves.toEqual({
      items: [issue({ id: 1, repository: { full_name: "alice/app" } })],
      hasMore: true,
    });
    expect(issueApi.listRepo).toHaveBeenCalledWith({
      owner: "alice",
      repo: "app",
      state: undefined,
      q: undefined,
      page: 2,
      limit: 1,
    });
    expect(issueApi.search).not.toHaveBeenCalled();
  });

  it("keeps owner-only issue searches on the global search endpoint", async () => {
    issueApi.search.mockResolvedValue([
      issue({ id: 1, repository: { full_name: "alice/app" } }),
      issue({ id: 2, repository: { full_name: "alice/other" } }),
    ]);

    await expect(searchIssues({ owner: "alice", query: "bug", state: "closed", page: 2, limit: 2 })).resolves.toEqual({
      items: [
        issue({ id: 1, repository: { full_name: "alice/app" } }),
        issue({ id: 2, repository: { full_name: "alice/other" } }),
      ],
      hasMore: true,
    });
    expect(issueApi.search).toHaveBeenCalledWith({
      type: "issues",
      state: "closed",
      q: "bug",
      owner: "alice",
      page: 2,
      limit: 2,
    });
    expect(issueApi.listRepo).not.toHaveBeenCalled();
  });

  it("bases repo-only pagination on the filtered issue count", async () => {
    issueApi.search.mockResolvedValue([
      issue({ id: 1, repository: { full_name: "alice/app", name: "app" } }),
      issue({ id: 2, repository: { full_name: "alice/other", name: "other" } }),
    ]);

    await expect(searchIssues({ repo: "target", page: 1, limit: 2 })).resolves.toEqual({
      items: [],
      hasMore: false,
    });
    expect(issueApi.search).toHaveBeenCalledWith({
      type: "issues",
      state: undefined,
      q: undefined,
      owner: undefined,
      page: 1,
      limit: 2,
    });
    expect(issueApi.listRepo).not.toHaveBeenCalled();
  });

  it("aggregates enabled my-issue searches, dedupes by id, and reports hasMore", async () => {
    issueApi.search
      .mockResolvedValueOnce([issue({ id: 1, title: "created" }), issue({ id: 2, title: "duplicate from created" })])
      .mockResolvedValueOnce([issue({ id: 2, title: "duplicate from assigned" }), issue({ id: 3, title: "assigned" })]);

    await expect(
      getMyIssues({
        includeCreated: true,
        includeAssigned: true,
        includeMentioned: false,
        includeRecentlyClosed: false,
        limit: 2,
      }),
    ).resolves.toEqual({
      items: [
        issue({ id: 1, title: "created" }),
        issue({ id: 2, title: "duplicate from assigned" }),
        issue({ id: 3, title: "assigned" }),
      ],
      hasMore: true,
    });
  });

  it("returns empty create issue metadata until owner and repo are known", async () => {
    await expect(getCreateIssueMetadata({ owner: "alice" })).resolves.toEqual({
      labels: [],
      milestones: [],
      assignees: [],
    });
    expect(issueApi.listLabels).not.toHaveBeenCalled();
  });

  it("loads create issue metadata in parallel for a selected repository", async () => {
    const labels = [{ id: 1, name: "bug" }] as Label[];
    const milestones = [{ id: 2, title: "v1" }] as Milestone[];
    const assignees = [{ id: 3, login: "alice" }] as User[];
    issueApi.listLabels.mockResolvedValue(labels);
    issueApi.listMilestones.mockResolvedValue(milestones);
    issueApi.listAssignees.mockResolvedValue(assignees);

    await expect(getCreateIssueMetadata({ owner: "alice", repo: "app" })).resolves.toEqual({
      labels,
      milestones,
      assignees,
    });
  });
});
