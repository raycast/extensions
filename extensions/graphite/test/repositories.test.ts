import { describe, expect, it } from "vitest";
import { findRepositoryForSlug, parseGitHubSlug } from "../src/lib/repositories";
import type { Repository } from "../src/lib/repositories";

describe("parseGitHubSlug", () => {
  it.each([
    { remote: "git@github.com:acme/web.git", expected: "acme/web" },
    { remote: "https://github.com/acme/web.git", expected: "acme/web" },
    { remote: "https://github.com/acme/web", expected: "acme/web" },
    { remote: "ssh://git@github.com/acme/web.git", expected: "acme/web" },
    { remote: "https://github.com/acme/web/", expected: "acme/web" },
    { remote: "garbage", expected: undefined },
  ])("parses $remote", ({ remote, expected }) => {
    expect(parseGitHubSlug(remote)).toBe(expected);
  });
});

describe("findRepositoryForSlug", () => {
  const repository: Repository = { path: "/fake/repos/web", name: "web", slug: "Acme/Web" };
  const repositories: Repository[] = [{ path: "/fake/repos/other", name: "other", slug: undefined }, repository];

  it.each([
    { owner: "acme", name: "web" },
    { owner: "ACME", name: "WEB" },
  ])("matches $owner/$name without case sensitivity", ({ owner, name }) => {
    expect(findRepositoryForSlug(repositories, owner, name)).toBe(repository);
  });

  it("returns undefined for an unknown repository", () => {
    expect(findRepositoryForSlug(repositories, "acme", "missing")).toBeUndefined();
  });
});
