import { describe, expect, it } from "vitest";
import { buildQueries, MAX_QUERY_LENGTH } from "../src/core/query";
import { DEFAULT_SETTINGS, Settings } from "../src/core/settings";

function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("buildQueries", () => {
  it("the defaults use @me and need no login", () => {
    const q = buildQueries(settings());
    expect(q.prs).toBe("is:pr is:open user:@me -author:@me");
    expect(q.issues).toBe("is:issue is:open user:@me -author:@me");
    expect(q.review).toBe("is:pr is:open review-requested:@me");
    expect(q.changesRequested).toBe("is:pr is:open author:@me review:changes_requested");
    expect(q.myPullRequests).toBe("is:pr is:open author:@me");
    expect(q.filtersDropped).toBe(false);
    expect(q.allowListEmpty).toBe(false);
  });

  it("a selected org uses org: instead of user:", () => {
    const q = buildQueries(settings({ accounts: ["alice"], organizations: ["acme"] }));
    expect(q.prs).toBe("is:pr is:open org:acme assignee:@me");
    expect(q.issues).toBe("is:issue is:open org:acme assignee:@me");
    expect(q.prs).not.toContain("user:");
    expect(q.prs).not.toContain("-author:");
    expect(q.review).toBe("is:pr is:open review-requested:@me org:acme");
    expect(q.changesRequested).toBe("is:pr is:open author:@me review:changes_requested org:acme");
    expect(q.myPullRequests).toBe("is:pr is:open author:@me org:acme");
  });

  it("your own PRs are not narrowed by account scope", () => {
    // Adding user:alice would lose PRs opened on someone else's repository.
    const q = buildQueries(settings({ accounts: ["alice"] }));
    expect(q.myPullRequests).toBe("is:pr is:open author:@me");
    expect(q.myPullRequests).not.toContain("user:");
  });

  it("several orgs OR together in the same qualifier", () => {
    const q = buildQueries(settings({ organizations: ["acme", "widgets"] }));
    expect(q.prs).toBe("is:pr is:open org:acme org:widgets assignee:@me");
    expect(q.review).toBe("is:pr is:open review-requested:@me org:acme org:widgets");
  });

  it("a deny-list appends -repo: under org scope too", () => {
    const q = buildQueries(settings({ organizations: ["acme"], repoList: ["acme/noisy"] }));
    expect(q.prs).toBe("is:pr is:open org:acme assignee:@me -repo:acme/noisy");
    expect(q.review).toBe("is:pr is:open review-requested:@me org:acme -repo:acme/noisy");
    expect(q.changesRequested).toBe(
      "is:pr is:open author:@me review:changes_requested org:acme -repo:acme/noisy",
    );
    expect(q.myPullRequests).toBe("is:pr is:open author:@me org:acme -repo:acme/noisy");
  });

  it("a bare repository name is completed with the first org when one is selected", () => {
    const q = buildQueries(settings({ accounts: ["alice"], organizations: ["acme"], repoList: ["noisy"] }));
    expect(q.prs).toContain("-repo:acme/noisy");
  });

  it("an allow-list drops user/org parts even with an org selected", () => {
    const q = buildQueries(
      settings({
        accounts: ["alice"],
        organizations: ["acme"],
        repoList: ["acme/one"],
        repoListIsAllowList: true,
      }),
    );
    expect(q.prs).toBe("is:pr is:open repo:acme/one assignee:@me");
    expect(q.prs).not.toContain("org:");
    expect(q.prs).not.toContain("user:");
    expect(q.review).toBe("is:pr is:open review-requested:@me org:acme");
    expect(q.changesRequested).toBe("is:pr is:open author:@me review:changes_requested repo:acme/one");
    expect(q.myPullRequests).toBe("is:pr is:open author:@me repo:acme/one");
  });

  it("several accounts produce several user: parts", () => {
    const q = buildQueries(settings({ accounts: ["alice", "acme"] }));
    expect(q.prs).toBe("is:pr is:open user:alice user:acme -author:@me");
  });

  it("a deny-list appends -repo: parts", () => {
    const q = buildQueries(settings({ accounts: ["alice"], repoList: ["alice/noisy"] }));
    expect(q.prs).toBe("is:pr is:open user:alice -author:@me -repo:alice/noisy");
    expect(q.review).toBe("is:pr is:open review-requested:@me -repo:alice/noisy");
  });

  it("a bare repository name is completed with the first account", () => {
    const q = buildQueries(settings({ accounts: ["alice"], repoList: ["noisy"] }));
    expect(q.prs).toContain("-repo:alice/noisy");
  });

  it("an allow-list uses repo: and drops user: parts", () => {
    const q = buildQueries(
      settings({ accounts: ["alice"], repoList: ["alice/one", "alice/two"], repoListIsAllowList: true }),
    );
    expect(q.prs).toBe("is:pr is:open repo:alice/one repo:alice/two -author:@me");
    expect(q.prs).not.toContain("user:");
  });

  it("an empty allow-list raises the flag", () => {
    const q = buildQueries(settings({ repoList: [], repoListIsAllowList: true }));
    expect(q.allowListEmpty).toBe(true);
  });

  it("a whitespace-only repository entry is ignored", () => {
    const q = buildQueries(settings({ accounts: ["alice"], repoList: ["  ", ""] }));
    expect(q.prs).toBe("is:pr is:open user:alice -author:@me");
  });

  it("a filter list past 4000 characters is trimmed and flagged", () => {
    const repoList = Array.from({ length: 300 }, (_, i) => `alice/repository-with-a-long-name-${i}`);
    const q = buildQueries(settings({ accounts: ["alice"], repoList }));
    expect(q.prs.length).toBeLessThanOrEqual(MAX_QUERY_LENGTH);
    expect(q.filtersDropped).toBe(true);
  });
});
