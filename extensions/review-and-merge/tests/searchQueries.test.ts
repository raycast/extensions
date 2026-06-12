import { describe, expect, it } from "vitest";
import {
  closedUnreviewedQuery,
  myOpenPullRequestsQuery,
  parseRepositories,
  pendingReviewQuery,
} from "../src/lib/searchQueries";

describe("searchQueries", () => {
  it("builds the query for my open PRs across all of GitHub", () => {
    expect(myOpenPullRequestsQuery()).toBe(
      "is:pr is:open author:@me sort:updated-desc",
    );
  });

  it("scopes my open PRs to an organization when provided", () => {
    expect(myOpenPullRequestsQuery({ organization: "acme" })).toBe(
      "org:acme is:pr is:open author:@me sort:updated-desc",
    );
  });

  it("scopes my open PRs to specific repositories when provided", () => {
    expect(
      myOpenPullRequestsQuery({ repositories: "acme/web, acme/api" }),
    ).toBe(
      "repo:acme/web repo:acme/api is:pr is:open author:@me sort:updated-desc",
    );
  });

  it("combines organization and repository scopes", () => {
    expect(
      myOpenPullRequestsQuery({
        organization: "acme",
        repositories: "octocat/hello-world",
      }),
    ).toBe(
      "org:acme repo:octocat/hello-world is:pr is:open author:@me sort:updated-desc",
    );
  });

  it("builds the query for PRs pending my review", () => {
    expect(pendingReviewQuery()).toBe(
      "is:pr is:open review-requested:@me sort:updated-desc",
    );
  });

  it("scopes pending-review PRs to an organization", () => {
    expect(pendingReviewQuery({ organization: "acme" })).toBe(
      "org:acme is:pr is:open review-requested:@me sort:updated-desc",
    );
  });

  it("scopes pending-review PRs to specific repositories", () => {
    expect(pendingReviewQuery({ repositories: "acme/web" })).toBe(
      "repo:acme/web is:pr is:open review-requested:@me sort:updated-desc",
    );
  });

  it("builds the closed-unreviewed query with a 30-day date floor", () => {
    expect(closedUnreviewedQuery(new Date("2026-06-12T15:30:00Z"))).toBe(
      "is:pr is:closed review-requested:@me updated:>=2026-05-13 sort:updated-desc",
    );
  });

  it("scopes the closed-unreviewed query to an organization", () => {
    expect(
      closedUnreviewedQuery(new Date("2026-06-12T15:30:00Z"), {
        organization: "acme",
      }),
    ).toBe(
      "org:acme is:pr is:closed review-requested:@me updated:>=2026-05-13 sort:updated-desc",
    );
  });

  it("scopes the closed-unreviewed query to specific repositories", () => {
    expect(
      closedUnreviewedQuery(new Date("2026-06-12T15:30:00Z"), {
        repositories: "acme/web acme/api",
      }),
    ).toBe(
      "repo:acme/web repo:acme/api is:pr is:closed review-requested:@me updated:>=2026-05-13 sort:updated-desc",
    );
  });
});

describe("parseRepositories", () => {
  it("returns an empty list for undefined or empty input", () => {
    expect(parseRepositories(undefined)).toEqual([]);
    expect(parseRepositories("")).toEqual([]);
    expect(parseRepositories("   ")).toEqual([]);
  });

  it("splits on commas and whitespace and trims entries", () => {
    expect(parseRepositories("acme/web, acme/api")).toEqual([
      "acme/web",
      "acme/api",
    ]);
    expect(parseRepositories("  acme/web   acme/api ")).toEqual([
      "acme/web",
      "acme/api",
    ]);
    expect(parseRepositories("acme/web,,acme/api")).toEqual([
      "acme/web",
      "acme/api",
    ]);
  });
});
