import { describe, expect, it } from "vitest";
import { classifyRequestError, InboxError, parseSectionsSummary } from "../src/lib/api";

describe("classifyRequestError", () => {
  it("returns an InboxError unchanged", () => {
    const error = new InboxError("SIGNED_OUT", "Sign in again.");
    expect(classifyRequestError(error)).toBe(error);
  });

  it.each([
    { label: "timeout", error: new DOMException("x", "TimeoutError") },
    { label: "abort", error: Object.assign(new Error("x"), { name: "AbortError" }) },
    { label: "failed fetch", error: new TypeError("fetch failed") },
    { label: "DNS failure", error: new Error("x", { cause: { code: "ENOTFOUND" } }) },
  ])("classifies $label as offline", ({ error }) => {
    const result = classifyRequestError(error);
    expect(result).toBeInstanceOf(InboxError);
    expect(result.kind).toBe("OFFLINE");
  });

  it("reports certificate failures as unexpected with actionable copy", () => {
    const result = classifyRequestError(new Error("x", { cause: { code: "SELF_SIGNED_CERT_IN_CHAIN" } }));
    expect(result.kind).toBe("UNEXPECTED");
    expect(result.message).toMatch(/certificate/i);
  });

  it("does not expose arbitrary error details", () => {
    const result = classifyRequestError(new Error("PRIVATE_INTERNAL_ERROR_123"));
    expect(result.kind).toBe("UNEXPECTED");
    expect(result.message).not.toContain("PRIVATE_INTERNAL_ERROR_123");
  });
});

describe("parseSectionsSummary", () => {
  const pr = {
    number: 42,
    title: "Improve error messages",
    state: "OPEN",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    repo: { name: "cli", owner: "example" },
    author: { name: "Test Author", login: "test-author", avatarUrl: "https://example.com/avatar.png" },
    reviewDecision: null,
  };
  const section = {
    name: "Needs review",
    sectionId: "needs-review",
    includeInTotalCount: true,
    totalUnpaginatedPrs: 12,
    prs: [pr],
  };

  it("parses valid sections and preserves the unpaginated count", () => {
    expect(parseSectionsSummary({ sections: [section] })).toEqual([section]);
  });

  it("rejects a body without sections", () => {
    expect(parseSectionsSummary({})).toBeUndefined();
  });

  it("keeps valid PRs when another PR is missing its number", () => {
    const { number, ...withoutNumber } = pr;
    expect(number).toBe(42);
    expect(parseSectionsSummary({ sections: [{ ...section, prs: [pr, withoutNumber] }] })).toEqual([section]);
  });

  it("builds a GitHub avatar URL when the supplied avatar is null", () => {
    const result = parseSectionsSummary({
      sections: [{ ...section, prs: [{ ...pr, author: { ...pr.author, avatarUrl: null } }] }],
    });
    expect(result?.[0]?.prs[0]?.author?.avatarUrl).toBe("https://github.com/test-author.png");
  });

  it("defaults the total to the number of valid PRs", () => {
    const result = parseSectionsSummary({
      sections: [{ name: section.name, sectionId: section.sectionId, includeInTotalCount: true, prs: [pr, {}] }],
    });
    expect(result?.[0]?.prs).toEqual([pr]);
    expect(result?.[0]?.totalUnpaginatedPrs).toBe(1);
  });

  it("defaults a malformed includeInTotalCount to false", () => {
    expect(parseSectionsSummary({ sections: [{ ...section, includeInTotalCount: "yes" }] })).toEqual([
      { ...section, includeInTotalCount: false },
    ]);
  });

  it("drops a section missing sectionId while preserving valid sections", () => {
    expect(
      parseSectionsSummary({ sections: [{ name: "Invalid", prs: [pr], includeInTotalCount: true }, section] }),
    ).toEqual([section]);
  });
});

describe("parseSectionsSummary schema drift", () => {
  it("treats a response where every pull request is unreadable as an error, not an empty inbox", () => {
    const body = {
      sections: [{ name: "Needs review", sectionId: "s1", includeInTotalCount: true, prs: [{ title: "no number" }] }],
    };
    expect(parseSectionsSummary(body)).toBeUndefined();
  });

  it("treats a response where every section is unreadable as an error", () => {
    expect(parseSectionsSummary({ sections: [{ name: "No id", prs: [] }] })).toBeUndefined();
  });

  it("keeps a genuinely empty inbox", () => {
    const body = { sections: [{ name: "Needs review", sectionId: "s1", includeInTotalCount: true, prs: [] }] };
    expect(parseSectionsSummary(body)).toEqual([
      { name: "Needs review", sectionId: "s1", includeInTotalCount: true, totalUnpaginatedPrs: 0, prs: [] },
    ]);
  });
});
