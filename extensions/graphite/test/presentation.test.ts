import { afterEach, describe, expect, it, vi } from "vitest";
import { humanize, pluralize, pullRequestLinks, pullRequestStatusTag, relativeTime } from "../src/lib/presentation";
import { mockPreferences } from "./mocks/raycast-api";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  mockPreferences.openPullRequestsIn = "graphite";
});

describe("humanize", () => {
  it("turns a merge status into sentence case", () => {
    expect(humanize("NEEDS_CODEOWNER_APPROVALS")).toBe("Needs codeowner approvals");
  });
});

describe("pluralize", () => {
  it.each([
    { count: 1, singular: "PR", plural: undefined, expected: "1 PR" },
    { count: 2, singular: "PR", plural: undefined, expected: "2 PRs" },
    { count: 2, singular: "branch", plural: "branches", expected: "2 branches" },
  ])("formats $expected", ({ count, singular, plural, expected }) => {
    expect(pluralize(count, singular, plural)).toBe(expected);
  });
});

describe("relativeTime", () => {
  it.each([
    { iso: "2026-01-15T12:00:00Z", expected: "just now" },
    { iso: "2026-01-15T11:59:40Z", expected: "just now" },
    { iso: "2026-01-15T11:55:00Z", expected: "5 minutes ago" },
    { iso: "2026-01-15T09:00:00Z", expected: "3 hours ago" },
    { iso: "2026-01-13T12:00:00Z", expected: "2 days ago" },
    { iso: "2026-01-15T12:05:00Z", expected: "in 5 minutes" },
  ])("formats $iso as $expected", ({ iso, expected }) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    // Pin the locale while preserving the real formatter's relative-time behavior.
    const RelativeTimeFormat = Intl.RelativeTimeFormat;
    vi.spyOn(Intl, "RelativeTimeFormat").mockImplementation(function (_locales, options) {
      return new RelativeTimeFormat("en", options);
    });
    expect(relativeTime(iso)).toBe(expected);
  });
});

describe("pullRequestStatusTag", () => {
  it.each([
    { state: "OPEN", isDraft: false, expected: "Open" },
    { state: "OPEN", isDraft: true, expected: "Draft" },
    { state: "MERGED", isDraft: false, expected: "Merged" },
    { state: "CLOSED", isDraft: false, expected: "Closed" },
  ])("labels $state (draft: $isDraft)", ({ state, isDraft, expected }) => {
    expect(pullRequestStatusTag(state, isDraft).value).toBe(expected);
  });
});

describe("pullRequestLinks", () => {
  it.each([
    { preference: "graphite", primaryName: "Graphite", primary: "https://app.example.test/github/pr/owner/repo/12" },
    { preference: "github", primaryName: "GitHub", primary: "https://github.com/owner/repo/pull/12" },
  ])("opens $primaryName by preference", ({ preference, primaryName, primary }) => {
    mockPreferences.openPullRequestsIn = preference;
    expect(pullRequestLinks("https://app.example.test", "owner", "repo", 12)).toEqual({
      graphite: "https://app.example.test/github/pr/owner/repo/12",
      github: "https://github.com/owner/repo/pull/12",
      primary,
      primaryName,
    });
  });
});
