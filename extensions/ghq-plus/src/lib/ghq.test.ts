import { describe, expect, it } from "vitest";
import { listRepositories, parseLines, resolveGhqBinary, toRepositories } from "./ghq";

describe("parseLines", () => {
  it("splits stdout into trimmed, non-empty lines", () => {
    expect(parseLines("a\nb\n")).toEqual(["a", "b"]);
  });

  it("handles CRLF line endings and blank lines", () => {
    expect(parseLines("a\r\n\r\n  b  \r\n\n")).toEqual(["a", "b"]);
  });

  it("returns an empty array for empty or whitespace-only input", () => {
    expect(parseLines("")).toEqual([]);
    expect(parseLines("   \n\n")).toEqual([]);
  });
});

describe("toRepositories", () => {
  const roots = ["/Users/dai/dev"];

  it("strips the ghq root and splits host/owner/name", () => {
    const [repo] = toRepositories(roots, ["/Users/dai/dev/github.com/windhorn/ghq"]);
    expect(repo).toEqual({
      path: "/Users/dai/dev/github.com/windhorn/ghq",
      relativePath: "github.com/windhorn/ghq",
      name: "ghq",
      owner: "windhorn",
      host: "github.com",
    });
  });

  it("handles two-segment paths without a host", () => {
    const [repo] = toRepositories(roots, ["/Users/dai/dev/act-node/generate_movie_from_images"]);
    expect(repo).toEqual({
      path: "/Users/dai/dev/act-node/generate_movie_from_images",
      relativePath: "act-node/generate_movie_from_images",
      name: "generate_movie_from_images",
      owner: "act-node",
      host: undefined,
    });
  });

  it("handles single-segment paths", () => {
    const [repo] = toRepositories(roots, ["/Users/dai/dev/solo"]);
    expect(repo).toEqual({
      path: "/Users/dai/dev/solo",
      relativePath: "solo",
      name: "solo",
      owner: undefined,
      host: undefined,
    });
  });

  it("keeps the deepest segments as host/owner/name for paths deeper than three segments", () => {
    const [repo] = toRepositories(roots, ["/Users/dai/dev/github.com/org/group/repo"]);
    expect(repo.relativePath).toBe("github.com/org/group/repo");
    expect(repo.name).toBe("repo");
    expect(repo.owner).toBe("group");
    expect(repo.host).toBe("github.com");
  });

  it("tolerates a trailing slash on the root", () => {
    const [repo] = toRepositories(["/Users/dai/dev/"], ["/Users/dai/dev/github.com/a/b"]);
    expect(repo.relativePath).toBe("github.com/a/b");
  });

  it("uses the longest matching root when multiple roots overlap", () => {
    const [repo] = toRepositories(["/Users/dai", "/Users/dai/dev"], ["/Users/dai/dev/github.com/a/b"]);
    expect(repo.relativePath).toBe("github.com/a/b");
  });

  it("does not treat a root as a prefix unless it matches on a path boundary", () => {
    const [repo] = toRepositories(["/Users/dai/dev"], ["/Users/dai/dev2/github.com/a/b"]);
    expect(repo.relativePath).toBe("/Users/dai/dev2/github.com/a/b");
  });

  it("falls back to the absolute path when no root matches", () => {
    const [repo] = toRepositories(roots, ["/opt/other/repo"]);
    expect(repo.relativePath).toBe("/opt/other/repo");
    expect(repo.name).toBe("repo");
  });

  it("preserves ghq's output order and drops duplicates", () => {
    const repos = toRepositories(roots, [
      "/Users/dai/dev/github.com/z/z",
      "/Users/dai/dev/github.com/a/a",
      "/Users/dai/dev/github.com/z/z",
    ]);
    expect(repos.map((r) => r.relativePath)).toEqual(["github.com/z/z", "github.com/a/a"]);
  });

  it("returns an empty array when there are no paths", () => {
    expect(toRepositories(roots, [])).toEqual([]);
  });
});

describe("resolveGhqBinary", () => {
  const home = "/Users/dai";

  it("returns the configured absolute path as-is", () => {
    expect(resolveGhqBinary("/opt/homebrew/bin/ghq", home)).toBe("/opt/homebrew/bin/ghq");
  });

  it("expands a leading ~/ to the home directory", () => {
    expect(resolveGhqBinary("~/.nix-profile/bin/ghq", home)).toBe("/Users/dai/.nix-profile/bin/ghq");
  });

  it("trims surrounding whitespace", () => {
    expect(resolveGhqBinary("  /usr/local/bin/ghq \n", home)).toBe("/usr/local/bin/ghq");
  });

  it("returns undefined when nothing is configured", () => {
    expect(resolveGhqBinary(undefined, home)).toBeUndefined();
    expect(resolveGhqBinary("", home)).toBeUndefined();
    expect(resolveGhqBinary("   ", home)).toBeUndefined();
  });
});

describe("listRepositories", () => {
  it("runs `ghq root --all` and `ghq list --full-path` and combines the results", async () => {
    const calls: string[][] = [];
    const exec = async (args: string[]) => {
      calls.push(args);
      if (args[0] === "root") {
        return "/Users/dai/dev\n";
      }
      return "/Users/dai/dev/github.com/windhorn/ghq\n/Users/dai/dev/github.com/x-motemen/ghq\n";
    };

    const repositories = await listRepositories(exec);

    expect(calls).toEqual([
      ["root", "--all"],
      ["list", "--full-path"],
    ]);
    expect(repositories.map((r) => r.relativePath)).toEqual(["github.com/windhorn/ghq", "github.com/x-motemen/ghq"]);
    expect(repositories[0].path).toBe("/Users/dai/dev/github.com/windhorn/ghq");
  });

  it("returns an empty list when ghq has no repositories", async () => {
    const exec = async (args: string[]) => (args[0] === "root" ? "/Users/dai/dev\n" : "");
    expect(await listRepositories(exec)).toEqual([]);
  });

  it("propagates errors from ghq", async () => {
    const exec = async () => {
      throw new Error("ghq exploded");
    };
    await expect(listRepositories(exec)).rejects.toThrow("ghq exploded");
  });
});
