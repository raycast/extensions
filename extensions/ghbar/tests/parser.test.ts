import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EMPTY_SOCIAL } from "../src/core/models";
import { ParseError, parseSnapshot } from "../src/core/parser";

/** A real-shaped GraphQL response used as the parser fixture. */
function fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(__dirname, "fixtures", `${name}.json`), "utf8"));
}

/** An empty but valid response; vary one field to build an edge case. */
function minimal(viewer: Record<string, unknown>, searches: Record<string, unknown> = {}): unknown {
  const empty = { issueCount: 0, nodes: [] };
  return {
    data: {
      viewer: { login: "a", name: null, avatarUrl: "x", ...viewer },
      prs: empty,
      issues: empty,
      review: empty,
      changesRequested: empty,
      myPullRequests: empty,
      rateLimit: { limit: 5000, remaining: 1, resetAt: "2026-08-18T13:00:00Z" },
      ...searches,
    },
  };
}

describe("parseSnapshot", () => {
  it("parses a real-shaped response", () => {
    const snap = parseSnapshot(fixture("response"));

    expect(snap.viewer.login).toBe("alice");
    expect(snap.viewer.name).toBe("Alice Smith");
    expect(snap.viewer.organizations).toEqual(["acme"]);
    expect(snap.prs).toHaveLength(4);
    expect(snap.issues).toHaveLength(1); // the one with a null author was dropped
    expect(snap.review).toHaveLength(1);
    expect(snap.changesRequested).toHaveLength(1);
    expect(snap.myPullRequests).toHaveLength(2);
    expect(snap.rateLimit.remaining).toBe(4911);
  });

  it("profile counters are summed", () => {
    const snap = parseSnapshot(fixture("response"));
    expect(snap.social.stars).toBe(511); // 283 + 217 + 11
    expect(snap.social.followers).toBe(2611);
    expect(snap.social.following).toBe(74);
    expect(snap.social.starsAreExact).toBe(true); // 3 repositories, all 3 counted
  });

  it("missing counter fields fall back to zero", () => {
    expect(parseSnapshot(minimal({})).social).toEqual(EMPTY_SOCIAL);
  });

  it("more than 100 repositories makes the star total a lower bound", () => {
    const snap = parseSnapshot(minimal({ repositories: { totalCount: 140, nodes: [{ stargazerCount: 5 }] } }));
    expect(snap.social.stars).toBe(5);
    expect(snap.social.starsAreExact).toBe(false);
  });

  it("the bot flag is read from __typename", () => {
    const snap = parseSnapshot(fixture("response"));
    expect(snap.prs.find((i) => i.number === 56)?.authorIsBot).toBe(true);
    expect(snap.prs.find((i) => i.number === 55)?.authorIsBot).toBe(false);
  });

  it("a login ending in [bot] also counts as a bot", () => {
    const snap = parseSnapshot(
      minimal(
        {},
        {
          prs: {
            issueCount: 1,
            nodes: [
              {
                number: 1,
                title: "t",
                url: "u",
                createdAt: "2026-08-18T07:00:00Z",
                isDraft: false,
                author: { login: "renovate[bot]", __typename: "User" },
                repository: { nameWithOwner: "a/b" },
              },
            ],
          },
        },
      ),
    );
    expect(snap.prs[0].authorIsBot).toBe(true);
  });

  it("a missing organizations field yields an empty list", () => {
    expect(parseSnapshot(minimal({})).viewer.organizations).toEqual([]);
  });

  it("an issueCount reaching 100 raises the truncation flag", () => {
    const snap = parseSnapshot(
      minimal(
        {},
        {
          prs: { issueCount: 140, nodes: [] },
          issues: { issueCount: 3, nodes: [] },
          changesRequested: { issueCount: 100, nodes: [] },
        },
      ),
    );
    expect(snap.truncated).toContain("pullRequests");
    expect(snap.truncated).not.toContain("issues");
    expect(snap.truncated).toContain("changesRequested");
  });

  it("an item with an invalid createdAt is dropped", () => {
    const snap = parseSnapshot(
      minimal(
        {},
        {
          prs: {
            issueCount: 1,
            nodes: [
              {
                number: 1,
                title: "t",
                url: "u",
                createdAt: "not a date",
                author: { login: "bob", __typename: "User" },
                repository: { nameWithOwner: "a/b" },
              },
            ],
          },
        },
      ),
    );
    expect(snap.prs).toHaveLength(0);
  });

  it("a GraphQL error is carried through", () => {
    expect(() => parseSnapshot({ errors: [{ message: "Bad credentials" }] })).toThrowError(
      expect.objectContaining({ kind: "graphQL", detail: "Bad credentials" }),
    );
  });

  it("a missing viewer throws", () => {
    expect(() => parseSnapshot({ data: {} })).toThrowError(ParseError);
  });

  it("a missing rateLimit throws", () => {
    const payload = minimal({}) as { data: Record<string, unknown> };
    delete payload.data.rateLimit;
    expect(() => parseSnapshot(payload)).toThrowError(expect.objectContaining({ detail: "missing rateLimit" }));
  });

  it("non-object input throws a ParseError rather than crashing", () => {
    expect(() => parseSnapshot("not json")).toThrowError(
      expect.objectContaining({ detail: "root is not an object" }),
    );
    expect(() => parseSnapshot(null)).toThrowError(ParseError);
  });
});
