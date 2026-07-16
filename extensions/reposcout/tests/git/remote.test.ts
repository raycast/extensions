import { describe, expect, it } from "vitest";
import { toWebUrl } from "../../src/git/remote";

describe("toWebUrl", () => {
  it("returns null for null or empty input", () => {
    expect(toWebUrl(null)).toBeNull();
    expect(toWebUrl("   ")).toBeNull();
  });

  it("converts scp-like SSH remotes", () => {
    expect(toWebUrl("git@github.com:owner/repo.git")).toBe("https://github.com/owner/repo");
  });

  it("converts ssh:// URLs and strips the port", () => {
    expect(toWebUrl("ssh://git@github.com:22/owner/repo.git")).toBe(
      "https://github.com/owner/repo",
    );
  });

  it("converts https remotes and strips credentials and .git", () => {
    expect(toWebUrl("https://token@gitlab.com/group/sub/repo.git")).toBe(
      "https://gitlab.com/group/sub/repo",
    );
  });

  it("converts git:// remotes", () => {
    expect(toWebUrl("git://github.com/owner/repo.git")).toBe("https://github.com/owner/repo");
  });

  it("preserves nested group paths", () => {
    expect(toWebUrl("git@gitlab.com:group/sub/repo.git")).toBe("https://gitlab.com/group/sub/repo");
  });

  it("returns null for unrecognized formats", () => {
    expect(toWebUrl("not a url")).toBeNull();
    expect(toWebUrl("/local/path/repo")).toBeNull();
  });
});
