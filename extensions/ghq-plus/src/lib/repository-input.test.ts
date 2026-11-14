import { describe, expect, it } from "vitest";
import {
  GITHUB_RESERVED_OWNERS,
  detectGitHubRepository,
  normalizeRepositoryInput,
  validateRepositoryInput,
} from "./repository-input";

const reservedOwners = [
  "settings",
  "orgs",
  "users",
  "notifications",
  "marketplace",
  "sponsors",
  "topics",
  "collections",
  "trending",
  "features",
  "apps",
  "enterprises",
  "pulls",
  "issues",
];

describe("GITHUB_RESERVED_OWNERS", () => {
  it("contains exactly the 14 reserved lower-case names", () => {
    expect(GITHUB_RESERVED_OWNERS).toHaveLength(14);
    expect([...GITHUB_RESERVED_OWNERS].sort()).toEqual([...reservedOwners].sort());
  });
});

describe("detectGitHubRepository", () => {
  it("returns an already canonical repository URL unchanged", () => {
    expect(detectGitHubRepository("https://github.com/x-motemen/ghq")).toBe("https://github.com/x-motemen/ghq");
  });

  it("discards sub-pages after owner/repo", () => {
    expect(detectGitHubRepository("https://github.com/octocat/Hello-World/tree/master")).toBe(
      "https://github.com/octocat/Hello-World",
    );
    expect(detectGitHubRepository("https://github.com/octocat/Hello-World/issues/123")).toBe(
      "https://github.com/octocat/Hello-World",
    );
    expect(detectGitHubRepository("https://github.com/x-motemen/ghq/releases/tag/v1.9.4")).toBe(
      "https://github.com/x-motemen/ghq",
    );
    expect(detectGitHubRepository("https://github.com/x-motemen/ghq/settings")).toBe(
      "https://github.com/x-motemen/ghq",
    );
  });

  it("discards the query string and the fragment", () => {
    expect(detectGitHubRepository("https://github.com/octocat/Spoon-Knife/pull/1?diff=split#discussion")).toBe(
      "https://github.com/octocat/Spoon-Knife",
    );
    expect(detectGitHubRepository("https://github.com/x-motemen/ghq?tab=readme-ov-file")).toBe(
      "https://github.com/x-motemen/ghq",
    );
    expect(detectGitHubRepository("https://github.com/x-motemen/ghq/blob/main/README.md#L10")).toBe(
      "https://github.com/x-motemen/ghq",
    );
    expect(detectGitHubRepository("https://github.com/x-motemen/ghq#readme")).toBe("https://github.com/x-motemen/ghq");
  });

  it("removes a trailing .git from the repository name", () => {
    expect(detectGitHubRepository("https://github.com/x-motemen/ghq.git")).toBe("https://github.com/x-motemen/ghq");
    expect(detectGitHubRepository("https://github.com/x-motemen/ghq.git/")).toBe("https://github.com/x-motemen/ghq");
  });

  it("removes only one trailing .git", () => {
    expect(detectGitHubRepository("https://github.com/owner/repo.git.git")).toBe("https://github.com/owner/repo.git");
  });

  it("ignores a trailing slash", () => {
    expect(detectGitHubRepository("https://github.com/x-motemen/ghq/")).toBe("https://github.com/x-motemen/ghq");
  });

  it("trims surrounding whitespace", () => {
    expect(detectGitHubRepository("  https://github.com/x-motemen/ghq\n")).toBe("https://github.com/x-motemen/ghq");
    expect(detectGitHubRepository("\t\r\nhttps://github.com/x-motemen/ghq/tree/master \n\n")).toBe(
      "https://github.com/x-motemen/ghq",
    );
  });

  it("lower-cases the scheme and the host but preserves the owner/repo case", () => {
    expect(detectGitHubRepository("https://GitHub.com/Owner/Repo")).toBe("https://github.com/Owner/Repo");
    expect(detectGitHubRepository("HTTPS://GITHUB.COM/Owner/Repo.git")).toBe("https://github.com/Owner/Repo");
  });

  it("accepts dots, underscores, hyphens and digits in the repository name", () => {
    expect(detectGitHubRepository("https://github.com/owner/.github")).toBe("https://github.com/owner/.github");
    expect(detectGitHubRepository("https://github.com/owner/my_repo-2.0.js")).toBe(
      "https://github.com/owner/my_repo-2.0.js",
    );
  });

  it("accepts hyphens and digits in the owner name", () => {
    expect(detectGitHubRepository("https://github.com/x-motemen-2/ghq")).toBe("https://github.com/x-motemen-2/ghq");
    expect(detectGitHubRepository("https://github.com/0/1")).toBe("https://github.com/0/1");
  });

  it("returns the SSH scp-like form as-is", () => {
    expect(detectGitHubRepository("git@github.com:windhorn/ghq.git")).toBe("git@github.com:windhorn/ghq.git");
    expect(detectGitHubRepository("git@github.com:windhorn/ghq")).toBe("git@github.com:windhorn/ghq");
    expect(detectGitHubRepository("git@github.com:Owner/My_Repo-2.0.git")).toBe("git@github.com:Owner/My_Repo-2.0.git");
  });

  it("trims surrounding whitespace around the SSH form", () => {
    expect(detectGitHubRepository("  git@github.com:windhorn/ghq.git\n")).toBe("git@github.com:windhorn/ghq.git");
  });

  it("matches the SSH host case-insensitively without rewriting it", () => {
    expect(detectGitHubRepository("git@GitHub.com:windhorn/ghq.git")).toBe("git@GitHub.com:windhorn/ghq.git");
  });

  it("returns undefined for empty or whitespace-only text", () => {
    expect(detectGitHubRepository("")).toBeUndefined();
    expect(detectGitHubRepository("   ")).toBeUndefined();
    expect(detectGitHubRepository(" \t\r\n")).toBeUndefined();
  });

  it("returns undefined when the text contains whitespace after trimming", () => {
    expect(detectGitHubRepository("see https://github.com/a/b for details")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/a/b\nhttps://github.com/c/d")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/a/b\tmain")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/a/b extra")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/a /b")).toBeUndefined();
    expect(detectGitHubRepository("git@github.com:a/b.git extra")).toBeUndefined();
    expect(detectGitHubRepository("gh repo clone owner/repo")).toBeUndefined();
    expect(detectGitHubRepository("git clone https://github.com/a/b.git")).toBeUndefined();
  });

  it("returns undefined for an SSH form with missing or extra parts", () => {
    expect(detectGitHubRepository("git@github.com:owner/repo/extra")).toBeUndefined();
    expect(detectGitHubRepository("git@github.com:owner")).toBeUndefined();
    expect(detectGitHubRepository("git@github.com:owner/")).toBeUndefined();
    expect(detectGitHubRepository("git@github.com:/repo")).toBeUndefined();
    expect(detectGitHubRepository("git@github.com:")).toBeUndefined();
  });

  it("returns undefined for other schemes and scheme-less input", () => {
    expect(detectGitHubRepository("http://github.com/owner/repo")).toBeUndefined();
    expect(detectGitHubRepository("ssh://git@github.com/owner/repo.git")).toBeUndefined();
    expect(detectGitHubRepository("git://github.com/owner/repo.git")).toBeUndefined();
    expect(detectGitHubRepository("github.com/owner/repo")).toBeUndefined();
    expect(detectGitHubRepository("owner/repo")).toBeUndefined();
    expect(detectGitHubRepository("repo")).toBeUndefined();
  });

  it("returns undefined when the https scheme is not followed by //", () => {
    expect(detectGitHubRepository("https:/github.com/owner/repo")).toBeUndefined();
    expect(detectGitHubRepository("https:github.com/owner/repo")).toBeUndefined();
  });

  it("returns undefined for other hosts and look-alike hosts", () => {
    expect(detectGitHubRepository("https://gist.github.com/octocat/6cad326836d38bd3a7ae")).toBeUndefined();
    expect(detectGitHubRepository("https://www.github.com/owner/repo")).toBeUndefined();
    expect(detectGitHubRepository("https://gitlab.com/owner/repo")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com.evil.example/o/r")).toBeUndefined();
    expect(detectGitHubRepository("https://evil.example/github.com/o/r")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com@evil.example/o/r")).toBeUndefined();
    expect(detectGitHubRepository("git@gitlab.com:owner/repo.git")).toBeUndefined();
    expect(detectGitHubRepository("git@github.com.evil.example:owner/repo.git")).toBeUndefined();
  });

  it("returns undefined for URLs carrying credentials or a port", () => {
    expect(detectGitHubRepository("https://token@github.com/owner/repo")).toBeUndefined();
    expect(detectGitHubRepository("https://user:secret@github.com/owner/repo")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com:8443/owner/repo")).toBeUndefined();
  });

  it("returns undefined for URLs with fewer than two path segments", () => {
    expect(detectGitHubRepository("https://github.com/windhorn")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/windhorn/")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/windhorn?tab=repositories")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com")).toBeUndefined();
  });

  it("returns undefined for malformed URLs", () => {
    expect(detectGitHubRepository("https://")).toBeUndefined();
    expect(detectGitHubRepository("https://[github.com]/owner/repo")).toBeUndefined();
  });

  it("returns undefined for an invalid owner", () => {
    expect(detectGitHubRepository("https://github.com/-owner/repo")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/own_er/repo")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/own.er/repo")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/own%20er/repo")).toBeUndefined();
    expect(detectGitHubRepository("git@github.com:-owner/repo.git")).toBeUndefined();
    expect(detectGitHubRepository("git@github.com:own_er/repo.git")).toBeUndefined();
  });

  it("returns undefined for an invalid repository name", () => {
    expect(detectGitHubRepository("https://github.com/owner/re%20po")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/owner/re+po")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/owner/.git")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/owner/.")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/owner/..")).toBeUndefined();
    expect(detectGitHubRepository("git@github.com:owner/re%20po.git")).toBeUndefined();
    expect(detectGitHubRepository("git@github.com:owner/.git")).toBeUndefined();
    expect(detectGitHubRepository("git@github.com:owner/.")).toBeUndefined();
    expect(detectGitHubRepository("git@github.com:owner/..")).toBeUndefined();
  });

  it("returns undefined for reserved first path segments", () => {
    expect(detectGitHubRepository("https://github.com/settings/tokens")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/orgs/windhorn/people")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/marketplace/actions/checkout")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/issues/assigned")).toBeUndefined();
  });

  it.each(reservedOwners)("returns undefined for the reserved owner %s", (owner) => {
    expect(detectGitHubRepository(`https://github.com/${owner}/repo`)).toBeUndefined();
    expect(detectGitHubRepository(`git@github.com:${owner}/repo.git`)).toBeUndefined();
  });

  it("matches reserved owners case-insensitively", () => {
    expect(detectGitHubRepository("https://github.com/Settings/tokens")).toBeUndefined();
    expect(detectGitHubRepository("https://github.com/ORGS/windhorn/people")).toBeUndefined();
    expect(detectGitHubRepository("git@github.com:Settings/tokens.git")).toBeUndefined();
  });

  it("rejects reserved names only when they are the whole owner", () => {
    expect(detectGitHubRepository("https://github.com/appsmithorg/appsmith")).toBe(
      "https://github.com/appsmithorg/appsmith",
    );
    expect(detectGitHubRepository("https://github.com/my-settings/repo")).toBe("https://github.com/my-settings/repo");
    expect(detectGitHubRepository("https://github.com/owner/settings")).toBe("https://github.com/owner/settings");
    expect(detectGitHubRepository("git@github.com:owner/issues.git")).toBe("git@github.com:owner/issues.git");
  });
});

describe("normalizeRepositoryInput", () => {
  it("canonicalizes github.com HTTPS URLs", () => {
    expect(normalizeRepositoryInput("https://github.com/octocat/Hello-World/tree/master")).toBe(
      "https://github.com/octocat/Hello-World",
    );
    expect(normalizeRepositoryInput("https://github.com/octocat/Spoon-Knife/pull/1?diff=split#discussion")).toBe(
      "https://github.com/octocat/Spoon-Knife",
    );
    expect(normalizeRepositoryInput("  https://GitHub.com/x-motemen/ghq.git\n")).toBe(
      "https://github.com/x-motemen/ghq",
    );
  });

  it("keeps the SSH form as-is apart from trimming", () => {
    expect(normalizeRepositoryInput("git@github.com:windhorn/ghq.git")).toBe("git@github.com:windhorn/ghq.git");
    expect(normalizeRepositoryInput(" git@github.com:windhorn/ghq \n")).toBe("git@github.com:windhorn/ghq");
  });

  it("passes non-GitHub input through untouched", () => {
    expect(normalizeRepositoryInput("gitlab.com/foo/bar")).toBe("gitlab.com/foo/bar");
    expect(normalizeRepositoryInput("owner/repo")).toBe("owner/repo");
    expect(normalizeRepositoryInput("ghq")).toBe("ghq");
    expect(normalizeRepositoryInput("github.com/owner/repo")).toBe("github.com/owner/repo");
    expect(normalizeRepositoryInput("https://gitlab.com/foo/bar/-/tree/main?ref=x#readme")).toBe(
      "https://gitlab.com/foo/bar/-/tree/main?ref=x#readme",
    );
    expect(normalizeRepositoryInput("ssh://git@github.com/owner/repo.git")).toBe("ssh://git@github.com/owner/repo.git");
  });

  it("passes undetected github.com URLs through untouched", () => {
    expect(normalizeRepositoryInput("https://github.com/settings/tokens")).toBe("https://github.com/settings/tokens");
    expect(normalizeRepositoryInput("https://github.com/windhorn")).toBe("https://github.com/windhorn");
    expect(normalizeRepositoryInput("http://github.com/owner/repo/tree/main")).toBe(
      "http://github.com/owner/repo/tree/main",
    );
    expect(normalizeRepositoryInput("https://token@github.com/owner/repo.git")).toBe(
      "https://token@github.com/owner/repo.git",
    );
  });

  it("trims surrounding whitespace of passed-through input", () => {
    expect(normalizeRepositoryInput("  owner/repo \n")).toBe("owner/repo");
    expect(normalizeRepositoryInput("\tgitlab.com/foo/bar\r\n")).toBe("gitlab.com/foo/bar");
  });

  it("keeps inner whitespace of passed-through input", () => {
    expect(normalizeRepositoryInput(" gh repo clone owner/repo ")).toBe("gh repo clone owner/repo");
    expect(normalizeRepositoryInput("see https://github.com/a/b for details")).toBe(
      "see https://github.com/a/b for details",
    );
  });

  it("returns an empty string for empty or whitespace-only input", () => {
    expect(normalizeRepositoryInput("")).toBe("");
    expect(normalizeRepositoryInput("  \n")).toBe("");
  });
});

describe("validateRepositoryInput", () => {
  it("requires a value", () => {
    expect(validateRepositoryInput("")).toBe("Repository is required");
    expect(validateRepositoryInput("   ")).toBe("Repository is required");
    expect(validateRepositoryInput(" \t\r\n")).toBe("Repository is required");
  });

  it("rejects input containing whitespace", () => {
    expect(validateRepositoryInput("owner/repo extra")).toBe("Repository must not contain whitespace");
    expect(validateRepositoryInput("owner/repo\textra")).toBe("Repository must not contain whitespace");
    expect(validateRepositoryInput("https://github.com/a/b\nhttps://github.com/c/d")).toBe(
      "Repository must not contain whitespace",
    );
    expect(validateRepositoryInput("gh repo clone owner/repo")).toBe("Repository must not contain whitespace");
    expect(validateRepositoryInput("owner/repo　extra")).toBe("Repository must not contain whitespace");
  });

  it("ignores surrounding whitespace", () => {
    expect(validateRepositoryInput("  owner/repo \n")).toBeUndefined();
    expect(validateRepositoryInput("\thttps://github.com/x-motemen/ghq\r\n")).toBeUndefined();
  });

  it("accepts free-form repository input", () => {
    expect(validateRepositoryInput("https://github.com/x-motemen/ghq")).toBeUndefined();
    expect(validateRepositoryInput("git@github.com:windhorn/ghq.git")).toBeUndefined();
    expect(validateRepositoryInput("gitlab.com/foo/bar")).toBeUndefined();
    expect(validateRepositoryInput("owner/repo")).toBeUndefined();
    expect(validateRepositoryInput("ghq")).toBeUndefined();
    expect(validateRepositoryInput("https://github.com/settings/tokens")).toBeUndefined();
  });

  it("accepts input starting with a hyphen", () => {
    expect(validateRepositoryInput("-u")).toBeUndefined();
    expect(validateRepositoryInput("--update")).toBeUndefined();
    expect(validateRepositoryInput("-owner/repo")).toBeUndefined();
  });
});
