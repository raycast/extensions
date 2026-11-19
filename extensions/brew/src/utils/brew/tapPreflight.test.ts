import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  closestPackages,
  forgetRepoReads,
  preflightTap,
  readmeLeads,
  tapContents,
  type RepoReader,
} from "./tapPreflight";
import { gitReader } from "./tapRepoGit";

describe("tapContents", () => {
  it("reads formulae from Formula/, including sharded subfolders", () => {
    expect(tapContents(["Formula/rcc.rb", "Formula/c/canary.rb", "README.md"])).toEqual({
      formulae: ["canary", "rcc"],
      casks: [],
      commands: [],
    });
  });

  it("prefers Formula/ over HomebrewFormula/ over the top level, as brew does", () => {
    expect(tapContents(["Formula/a.rb", "HomebrewFormula/b.rb", "c.rb"]).formulae).toEqual(["a"]);
    expect(tapContents(["HomebrewFormula/b.rb", "c.rb"]).formulae).toEqual(["b"]);
    expect(tapContents(["c.rb", "lib/d.rb"]).formulae).toEqual(["c"]);
  });

  it("reads casks and commands", () => {
    expect(tapContents(["Casks/w/whatcable.rb", "cmd/brew-rmtree.rb", "cmd/lib/helper.rb"])).toEqual({
      formulae: [],
      casks: ["whatcable"],
      commands: ["brew-rmtree.rb"],
    });
  });

  it("finds nothing in an app repo whose formula lives somewhere brew never looks", () => {
    // thousandflowers/Raccoon keeps its formula under docs/, which brew ignores.
    expect(tapContents(["README.md", "rcc", "bin/rcc-tui", "docs/homebrew/Formula/rcc.rb", "lib/core.sh"])).toEqual({
      formulae: [],
      casks: [],
      commands: [],
    });
  });

  it("ignores hidden files, as brew's glob does", () => {
    expect(tapContents(["Formula/.hidden.rb", "Formula/.github/x.rb", "Formula/real.rb"]).formulae).toEqual(["real"]);
  });

  it("lets a hidden file mark Formula/ as the formula folder, as brew's directory check does", () => {
    expect(tapContents(["Formula/.gitkeep", "helper.rb"]).formulae).toEqual([]);
  });
});

describe("readmeLeads", () => {
  it("reads a qualified install line", () => {
    expect(readmeLeads("Via Homebrew (recommended):\n\n```sh\nbrew install thousandflowers/tap/rcc\n```")).toEqual([
      { tap: "thousandflowers/tap", package: "thousandflowers/tap/rcc" },
    ]);
  });

  it("keeps --cask, a tap line with its URL, and drops duplicates and official packages", () => {
    const readme = [
      "brew install --cask acme/tools/widget",
      "brew tap acme/odd https://github.com/acme/odd-tap",
      "brew install wget",
      "`brew install --cask acme/tools/widget` again",
    ].join("\n");
    expect(readmeLeads(readme)).toEqual([
      { tap: "acme/tools", package: "acme/tools/widget", cask: true },
      { tap: "acme/odd", url: "https://github.com/acme/odd-tap" },
    ]);
  });

  it("reads a tap line and an install line for the same tap as one lead, so the install isn't lost", () => {
    expect(readmeLeads("brew tap acme/tools && brew install acme/tools/frob")).toEqual([
      { tap: "acme/tools", package: "acme/tools/frob" },
    ]);
  });

  it("takes a later tap line's URL onto the install before it", () => {
    expect(readmeLeads("brew install acme/tools/frob\nbrew tap acme/tools https://git.example.com/acme/tools")).toEqual(
      [{ tap: "acme/tools", url: "https://git.example.com/acme/tools", package: "acme/tools/frob" }],
    );
  });

  it("gives the tap line's URL to every install line for that tap", () => {
    const readme = [
      "brew tap acme/tools https://git.example.com/acme/tools",
      "brew install acme/tools/old",
      "brew install --cask acme/tools/new",
    ].join("\n");
    expect(readmeLeads(readme)).toEqual([
      { tap: "acme/tools", url: "https://git.example.com/acme/tools", package: "acme/tools/old" },
      { tap: "acme/tools", url: "https://git.example.com/acme/tools", package: "acme/tools/new", cask: true },
    ]);
  });

  it("keeps the tap line's URL on the install it merges with", () => {
    expect(readmeLeads("brew tap acme/tools https://git.example.com/acme/tools\nbrew install acme/tools/frob")).toEqual(
      [{ tap: "acme/tools", url: "https://git.example.com/acme/tools", package: "acme/tools/frob" }],
    );
  });

  it.each([
    ["brew install acme/tap/tool for macOS/Linux", { tap: "acme/tap", package: "acme/tap/tool" }],
    ["brew install acme/tap/tool (see docs/install)", { tap: "acme/tap", package: "acme/tap/tool" }],
    [
      "brew install --cask acme/tap/tool # or download from https://example.com/x",
      { tap: "acme/tap", package: "acme/tap/tool", cask: true },
    ],
    ["brew tap acme/tools, then see https://example.com/acme/docs", { tap: "acme/tools" }],
  ])("stops reading %j at the first word that isn't an argument", (line, lead) => {
    expect(readmeLeads(line)).toEqual([lead]);
  });

  it("reads every qualified package on one install line, after an official one too", () => {
    expect(readmeLeads("brew install wget acme/tools/widget")).toEqual([
      { tap: "acme/tools", package: "acme/tools/widget" },
    ]);
    expect(readmeLeads("brew install --cask acme/tools/a acme/tools/b for macOS")).toEqual([
      { tap: "acme/tools", package: "acme/tools/a", cask: true },
      { tap: "acme/tools", package: "acme/tools/b", cask: true },
    ]);
  });

  it("reads nothing from an official install followed by prose with a slash", () => {
    expect(readmeLeads("brew install wget on macOS/Linux")).toEqual([]);
  });
});

type FakeRepo = { paths?: string[]; readme?: string; unchecked?: string };

/** A fake reader: repositories by GitHub `owner/repo`; anything else is not found. */
function repos(table: Record<string, FakeRepo>): RepoReader & { calls: string[] } {
  const calls: string[] = [];
  const reader: RepoReader = async (url) => {
    calls.push(url);
    const key = /github\.com\/(.+?)(?:\.git)?$/i.exec(url)?.[1].toLowerCase() ?? "";
    const repo = table[key];
    if (!repo) return { kind: "not-found" };
    if (repo.unchecked) return { kind: "unchecked", reason: repo.unchecked };
    return { kind: "ok", paths: repo.paths ?? [], readme: repo.readme ?? "" };
  };
  return Object.assign(reader, { calls });
}

const THOUSANDFLOWERS: Record<string, FakeRepo> = {
  "thousandflowers/raccoon": {
    paths: ["README.md", "rcc", "docs/homebrew/Formula/rcc.rb"],
    readme: "Via Homebrew (recommended):\n\nbrew install thousandflowers/tap/rcc\n",
  },
  "thousandflowers/homebrew-tap": {
    paths: ["Formula/canary.rb", "Formula/qr-multi-imgs.rb", "Formula/rcc.rb", "Formula/skillreaper.rb"],
  },
  // A migrated tap: it exists and has no packages, so it is never a lead.
  "thousandflowers/homebrew-raccoon": { paths: ["README.md", "tap_migrations.json"] },
};
const TAP_CONTENTS = { formulae: ["canary", "qr-multi-imgs", "rcc", "skillreaper"], casks: [], commands: [] };

describe("preflightTap", () => {
  it("names the real tap and package when the README does (the Raccoon case)", async () => {
    const result = await preflightTap(
      { tap: "thousandflowers/raccoon", url: "https://github.com/thousandflowers/Raccoon" },
      repos(THOUSANDFLOWERS),
    );
    expect(result).toEqual({
      kind: "not-a-tap",
      repo: "github.com/thousandflowers/Raccoon",
      lead: {
        target: { tap: "thousandflowers/tap", package: "thousandflowers/tap/rcc" },
        contents: TAP_CONTENTS,
        source: "readme",
        differentOwner: false,
      },
    });
  });

  it("reports a real tap's contents, reading the homebrew- repo for a bare name", async () => {
    const reader = repos(THOUSANDFLOWERS);
    expect(await preflightTap({ tap: "thousandflowers/tap" }, reader)).toEqual({ kind: "tap", contents: TAP_CONTENTS });
    expect(reader.calls).toEqual(["https://github.com/thousandflowers/homebrew-tap"]);
  });

  it("confirms a named package, and suggests the tap's others when it is missing", async () => {
    const found = await preflightTap(
      { tap: "thousandflowers/tap", package: "thousandflowers/tap/rcc" },
      repos(THOUSANDFLOWERS),
    );
    expect(found.kind).toBe("tap");
    const missing = await preflightTap(
      { tap: "thousandflowers/tap", package: "thousandflowers/tap/rcx" },
      repos(THOUSANDFLOWERS),
    );
    expect(missing).toMatchObject({ kind: "missing-package", package: "rcx" });
  });

  it("only accepts a cask when the pasted line said --cask", async () => {
    const result = await preflightTap(
      { tap: "acme/tools", package: "acme/tools/widget", cask: true },
      repos({ "acme/homebrew-tools": { paths: ["Formula/widget.rb"] } }),
    );
    expect(result.kind).toBe("missing-package");
  });

  it("drops a README lead whose tap lacks the package, then tries the owner's own tap", async () => {
    const result = await preflightTap(
      { tap: "acme/widget", url: "https://github.com/acme/widget" },
      repos({
        "acme/widget": { paths: ["src/main.c"], readme: "brew install acme/tools/widget" },
        "acme/homebrew-tools": { paths: ["Formula/other.rb"] },
        "acme/homebrew-tap": { paths: ["Formula/a.rb", "Casks/b.rb"] },
      }),
    );
    expect(result).toMatchObject({
      kind: "not-a-tap",
      lead: { target: { tap: "acme/tap" }, source: "owner", differentOwner: false },
    });
  });

  it("flags a README lead under another owner", async () => {
    const result = await preflightTap(
      { tap: "acme/widget", url: "https://github.com/acme/widget" },
      repos({
        "acme/widget": { paths: ["src/main.c"], readme: "brew install someone-else/tap/widget" },
        "someone-else/homebrew-tap": { paths: ["Formula/widget.rb"] },
      }),
    );
    expect(result).toMatchObject({ kind: "not-a-tap", lead: { source: "readme", differentOwner: true } });
  });

  it("finds no lead when nothing checks out", async () => {
    const result = await preflightTap(
      { tap: "acme/notes", url: "https://github.com/acme/notes" },
      repos({ "acme/notes": { paths: ["notes.md"], readme: "Just notes." } }),
    );
    expect(result).toEqual({ kind: "not-a-tap", repo: "github.com/acme/notes" });
  });

  it("says not-found when there is no repository, which covers private repos too", async () => {
    expect(await preflightTap({ tap: "acme/secret" }, repos({}))).toEqual({
      kind: "not-found",
      repo: "github.com/acme/homebrew-secret",
    });
  });

  it("treats an empty repository as a repo with nothing in it", async () => {
    const result = await preflightTap({ tap: "acme/empty" }, repos({ "acme/homebrew-empty": { paths: [] } }));
    expect(result).toEqual({ kind: "not-a-tap", repo: "github.com/acme/homebrew-empty" });
  });

  it("reads another host, but only guesses at owner taps on GitHub", async () => {
    const reader: RepoReader = async (url) =>
      url === "https://gitlab.com/acme/homebrew-tools"
        ? { kind: "ok", paths: ["Formula/frob.rb"], readme: "" }
        : { kind: "not-found" };
    expect(await preflightTap({ tap: "acme/tools", url: "https://gitlab.com/acme/homebrew-tools" }, reader)).toEqual({
      kind: "tap",
      contents: { formulae: ["frob"], casks: [], commands: [] },
    });
  });

  it("gives up without guessing when it cannot look", async () => {
    expect(
      await preflightTap({ tap: "acme/tools" }, repos({ "acme/homebrew-tools": { unchecked: "Couldn't reach it" } })),
    ).toEqual({ kind: "unchecked", reason: "Couldn't reach it" });
    const broken: RepoReader = async () => {
      throw new Error("spawn failed");
    };
    expect(await preflightTap({ tap: "acme/tools" }, broken)).toEqual({ kind: "unchecked", reason: "spawn failed" });
  });
});

describe("preflightTap, leads", () => {
  it("checks an owner's tap for the package that was asked for", async () => {
    const table = { "acme/homebrew-widget": { paths: [] }, "acme/homebrew-tap": { paths: ["Formula/unrelated.rb"] } };
    expect(await preflightTap({ tap: "acme/widget", package: "acme/widget/widget" }, repos(table))).toEqual({
      kind: "not-a-tap",
      repo: "github.com/acme/homebrew-widget",
    });
    const withIt = { ...table, "acme/homebrew-tap": { paths: ["Formula/widget.rb"] } };
    expect(await preflightTap({ tap: "acme/widget", package: "acme/widget/widget" }, repos(withIt))).toMatchObject({
      lead: { target: { tap: "acme/tap", package: "acme/tap/widget" }, source: "owner" },
    });
  });

  it("follows a README lead with the same tap name and a different URL", async () => {
    const result = await preflightTap(
      { tap: "acme/widget" },
      repos({
        "acme/homebrew-widget": { paths: ["README.md"], readme: "brew tap acme/widget https://github.com/acme/widget" },
        "acme/widget": { paths: ["Formula/widget.rb"] },
      }),
    );
    expect(result).toMatchObject({
      kind: "not-a-tap",
      lead: { target: { tap: "acme/widget", url: "https://github.com/acme/widget" }, source: "readme" },
    });
  });

  it("accepts an alias, and never calls a name missing when the tap renames packages", async () => {
    const aliased = repos({ "acme/homebrew-tools": { paths: ["Formula/tool.rb", "Aliases/oldtool"] } });
    expect((await preflightTap({ tap: "acme/tools", package: "acme/tools/oldtool" }, aliased)).kind).toBe("tap");
    const renamed = repos({ "acme/homebrew-tools": { paths: ["Formula/tool.rb", "formula_renames.json"] } });
    expect((await preflightTap({ tap: "acme/tools", package: "acme/tools/oldtool" }, renamed)).kind).toBe("tap");
  });

  it("reads a repository once however often the package name changes", async () => {
    const reader = repos(THOUSANDFLOWERS);
    for (const name of ["r", "rc", "rcc"]) {
      await preflightTap({ tap: "thousandflowers/tap", package: `thousandflowers/tap/${name}` }, reader);
    }
    expect(reader.calls).toEqual(["https://github.com/thousandflowers/homebrew-tap"]);
  });

  it("reads a repository once when two candidates resolve to it at the same time", async () => {
    // The README lead and the owner's `tap` sibling are both thousandflowers/homebrew-tap.
    const reader = repos(THOUSANDFLOWERS);
    await preflightTap({ tap: "thousandflowers/raccoon", url: "https://github.com/thousandflowers/Raccoon" }, reader);
    expect(reader.calls.filter((url) => url.endsWith("/homebrew-tap"))).toHaveLength(1);
  });

  it("reads again after forgetRepoReads, so Refresh can change a not-found answer", async () => {
    const table: Record<string, FakeRepo> = {};
    const reader = repos(table);
    expect((await preflightTap({ tap: "acme/private" }, reader)).kind).toBe("not-found");
    table["acme/homebrew-private"] = { paths: ["Formula/a.rb"] };
    expect((await preflightTap({ tap: "acme/private" }, reader)).kind).toBe("not-found");
    forgetRepoReads(reader);
    expect((await preflightTap({ tap: "acme/private" }, reader)).kind).toBe("tap");
  });

  it("does not keep a failed read, so the next check asks again", async () => {
    let up = false;
    const calls: string[] = [];
    const reader: RepoReader = async (url) => {
      calls.push(url);
      return up ? { kind: "ok", paths: ["Formula/a.rb"], readme: "" } : { kind: "unchecked", reason: "offline" };
    };
    expect((await preflightTap({ tap: "acme/tools" }, reader)).kind).toBe("unchecked");
    up = true;
    expect((await preflightTap({ tap: "acme/tools" }, reader)).kind).toBe("tap");
    expect(calls).toHaveLength(2);
  });

  it("finds the package in the owner's tap when user/name is no repository", async () => {
    expect(await preflightTap({ tap: "thousandflowers/rcc" }, repos(THOUSANDFLOWERS))).toEqual({
      kind: "not-found",
      repo: "github.com/thousandflowers/homebrew-rcc",
      lead: {
        target: { tap: "thousandflowers/tap", package: "thousandflowers/tap/rcc" },
        contents: TAP_CONTENTS,
        source: "owner",
        differentOwner: false,
      },
    });
  });

  it("offers nothing when the owner's tap has no such package", async () => {
    expect(await preflightTap({ tap: "thousandflowers/nothing" }, repos(THOUSANDFLOWERS))).toEqual({
      kind: "not-found",
      repo: "github.com/thousandflowers/homebrew-nothing",
    });
  });
});

describe("closestPackages", () => {
  const contents = { formulae: ["canary", "qr-multi-imgs", "rcc", "skillreaper"], casks: ["rcc-gui"], commands: [] };

  it("ranks by how close the name is, and keeps each package's kind", () => {
    expect(closestPackages(contents, "rcx", 3)).toEqual([
      { name: "rcc", cask: false },
      { name: "rcc-gui", cask: true },
      { name: "canary", cask: false },
    ]);
  });

  it("lists everything when the tap is small", () => {
    expect(closestPackages(contents, "zzz", 10)).toHaveLength(5);
  });
});

/** The real reader, against repositories built on disk: offline, but real git. */
describe("gitReader", () => {
  const root = mkdtempSync(join(tmpdir(), "brew-tap-test-"));
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  const git = (cwd: string, ...args: string[]) =>
    execFileSync("/usr/bin/git", args, {
      cwd,
      env: {
        ...process.env,
        // The machine's own git config (commit signing, hooks) has no place in a fixture.
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_AUTHOR_NAME: "t",
        GIT_AUTHOR_EMAIL: "t@t",
        GIT_COMMITTER_NAME: "t",
        GIT_COMMITTER_EMAIL: "t@t",
      },
    });

  it("lists a repository's files and reads its README without checking it out", async () => {
    const repo = join(root, "tap");
    mkdirSync(join(repo, "Formula"), { recursive: true });
    writeFileSync(join(repo, "Formula", "frob.rb"), "class Frob < Formula; end\n");
    writeFileSync(join(repo, "README.md"), "brew install acme/tools/frob\n");
    git(repo, "init", "-q");
    git(repo, "add", ".");
    git(repo, "commit", "-q", "-m", "init");
    expect(await gitReader(`file://${repo}`, { readme: true })).toEqual({
      kind: "ok",
      paths: ["Formula/frob.rb", "README.md"],
      readme: "brew install acme/tools/frob\n",
    });
  });

  it("reads an empty repository as one with nothing in it", async () => {
    const repo = join(root, "empty");
    mkdirSync(repo);
    git(repo, "init", "-q", "--bare");
    expect(await gitReader(`file://${repo}`, { readme: true })).toEqual({ kind: "ok", paths: [], readme: "" });
  });

  it("reads a host it can't reach as unchecked, even when the URL contains 403", async () => {
    // `.invalid` never resolves, so git fails at DNS and quotes the URL back.
    const read = await gitReader("https://git.example.invalid/team/homebrew-tool403", { readme: false });
    expect(read.kind).toBe("unchecked");
  });

  it("says not-found for a repository that isn't there", async () => {
    expect(await gitReader(`file://${join(root, "nothing-here")}`, { readme: true })).toEqual({ kind: "not-found" });
  });
});

describe("preflightTap, what it reads", () => {
  it("reads the README of the pasted repository only, never a lead's", async () => {
    const asked: [string, boolean][] = [];
    const inner = repos(THOUSANDFLOWERS);
    const reader: RepoReader = (url, opts) => {
      asked.push([url, opts.readme]);
      return inner(url, opts);
    };
    await preflightTap({ tap: "thousandflowers/raccoon", url: "https://github.com/thousandflowers/Raccoon" }, reader);
    expect(asked.filter(([, readme]) => readme).map(([url]) => url)).toEqual([
      "https://github.com/thousandflowers/Raccoon",
    ]);
  });

  it("does not remember a read that was canceled", async () => {
    const reader = repos(THOUSANDFLOWERS);
    const canceled = new AbortController();
    canceled.abort();
    await preflightTap({ tap: "thousandflowers/tap" }, reader, canceled.signal);
    await preflightTap({ tap: "thousandflowers/tap" }, reader);
    expect(reader.calls).toHaveLength(2);
  });
});

describe("preflightTap, uncertain answers", () => {
  it("marks an answer incomplete when a lead couldn't be read, so it is asked again", async () => {
    const table: Record<string, FakeRepo> = {
      ...THOUSANDFLOWERS,
      "thousandflowers/homebrew-tap": { unchecked: "timed out" },
    };
    const result = await preflightTap(
      { tap: "thousandflowers/raccoon", url: "https://github.com/thousandflowers/Raccoon" },
      repos(table),
    );
    expect(result).toEqual({ kind: "not-a-tap", repo: "github.com/thousandflowers/Raccoon", incomplete: true });
  });

  it("keeps the case of a path on hosts other than GitHub", async () => {
    const calls: string[] = [];
    const reader: RepoReader = async (url) => {
      calls.push(url);
      return url.endsWith("/Tools") ? { kind: "ok", paths: ["Formula/a.rb"], readme: "" } : { kind: "not-found" };
    };
    expect((await preflightTap({ tap: "acme/tools", url: "https://git.example.org/team/tools" }, reader)).kind).toBe(
      "not-found",
    );
    expect((await preflightTap({ tap: "acme/tools", url: "https://git.example.org/team/Tools" }, reader)).kind).toBe(
      "tap",
    );
    expect(calls).toHaveLength(2);
  });
});
