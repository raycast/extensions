import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  CHANGELOG_TITLE,
  INITIAL_TAG,
  ReleaseError,
  hasChanges,
  insertEntry,
  main,
  parseArgs,
  release,
  retitle,
  type ReleaseDeps,
} from "./release.mts";

const ENTRY = "## [1.1.0] - {PR_MERGE_DATE}\n\n- Add night mode\n- Fix bookmark deletion";
const CHANGELOG = `${CHANGELOG_TITLE}\n\n## [Initial Version] - {PR_MERGE_DATE}\n\n- First release\n`;

interface FakeRepo {
  status?: string;
  tags?: string;
  bumped?: string;
  entry?: string;
  changelog?: string;
  failWith?: unknown;
}

function fakeDeps(repo: FakeRepo = {}) {
  const calls: string[][] = [];
  const logs: string[] = [];
  const errors: string[] = [];
  const writes: string[] = [];
  const deps: ReleaseDeps = {
    run: (command, args) => {
      calls.push([command, ...args]);
      if (repo.failWith !== undefined) {
        throw repo.failWith;
      }
      if (command === "git" && args[0] === "status") {
        return repo.status ?? "";
      }
      if (command === "git" && args[0] === "tag" && args[1] === "--list") {
        return repo.tags ?? "v1.0.0";
      }
      if (command === "git-cliff" && args[0] === "--bumped-version") {
        return repo.bumped ?? "v1.1.0";
      }
      if (command === "git-cliff") {
        return repo.entry ?? ENTRY;
      }
      return "";
    },
    readChangelog: () => repo.changelog ?? CHANGELOG,
    writeChangelog: (content) => writes.push(content),
    log: (message) => logs.push(message),
    error: (message) => errors.push(message),
  };
  return { deps, calls, logs, errors, writes };
}

describe("parseArgs", () => {
  it("reads --dry-run and --title", () => {
    expect(parseArgs([])).toEqual({ dryRun: false, title: null });
    expect(parseArgs(["--dry-run", "--title", " Night Mode "])).toEqual({ dryRun: true, title: "Night Mode" });
  });

  it.each([
    [["--title"], "--title needs a value."],
    [["--title", "--dry-run"], "--title needs a value."],
    [["--title", "[Night]"], "--title cannot contain square brackets."],
    [["--force"], "Unknown option: --force"],
  ])("rejects %j", (argv, message) => {
    expect(() => parseArgs(argv)).toThrow(message);
  });
});

describe("changelog helpers", () => {
  it("detects bullet entries", () => {
    expect(hasChanges(ENTRY)).toBe(true);
    expect(hasChanges("## [1.1.0] - {PR_MERGE_DATE}")).toBe(false);
  });

  it("keeps or replaces the entry title", () => {
    expect(retitle(`${ENTRY}\n`, null)).toBe(ENTRY);
    expect(retitle(ENTRY, "Night Mode").split("\n")[0]).toBe("## [Night Mode] - {PR_MERGE_DATE}");
    expect(() => retitle("## 1.1.0", null)).toThrow("Unexpected git-cliff heading: ## 1.1.0");
  });

  it("inserts the newest entry below the title", () => {
    expect(insertEntry(CHANGELOG, ENTRY)).toBe(
      `${CHANGELOG_TITLE}\n\n${ENTRY}\n\n## [Initial Version] - {PR_MERGE_DATE}\n\n- First release\n`,
    );
    expect(insertEntry(`${CHANGELOG_TITLE}\r\n`, ENTRY)).toBe(`${CHANGELOG_TITLE}\n\n${ENTRY}\n`);
    expect(insertEntry(CHANGELOG_TITLE, ENTRY)).toBe(`${CHANGELOG_TITLE}\n\n${ENTRY}\n`);
    expect(() => insertEntry("# Other Title\n", ENTRY)).toThrow(ReleaseError);
  });
});

describe("release", () => {
  it("writes the entry, commits, and tags the bumped version", () => {
    const { deps, calls, logs, writes } = fakeDeps();

    release({ dryRun: false, title: null }, deps);

    expect(writes).toEqual([insertEntry(CHANGELOG, ENTRY)]);
    expect(calls.slice(-3)).toEqual([
      ["git", "add", "CHANGELOG.md"],
      ["git", "commit", "-m", "chore(release): v1.1.0"],
      ["git", "tag", "-a", "v1.1.0", "-m", "Release v1.1.0"],
    ]);
    expect(logs).toEqual(["Released v1.1.0. Run npm run publish to open the Raycast Store pull request."]);
  });

  it("uses a readable title when given", () => {
    const { deps, writes } = fakeDeps();
    release({ dryRun: false, title: "Night Mode" }, deps);
    expect(writes[0]).toContain("## [Night Mode] - {PR_MERGE_DATE}\n\n- Add night mode");
  });

  it("previews without checking the tree, writing, or tagging", () => {
    const { deps, calls, logs, writes } = fakeDeps({ status: " M src/index.ts" });

    release({ dryRun: true, title: null }, deps);

    expect(writes).toEqual([]);
    expect(calls.map((call) => call[1])).not.toContain("status");
    expect(calls.map((call) => call[1])).not.toContain("commit");
    expect(logs).toEqual([`Dry run: v1.1.0\n\n${ENTRY}`]);
  });

  it("refuses to release with uncommitted changes or nothing user-facing", () => {
    expect(() => release({ dryRun: false, title: null }, fakeDeps({ status: " M CHANGELOG.md" }).deps)).toThrow(
      "Commit or stash your changes before releasing.",
    );
    expect(() => release({ dryRun: false, title: null }, fakeDeps({ bumped: "v1.0.0" }).deps)).toThrow(
      "No user-facing changes (feat, fix, perf) since v1.0.0.",
    );
    expect(() =>
      release({ dryRun: false, title: null }, fakeDeps({ entry: "## [1.1.0] - {PR_MERGE_DATE}" }).deps),
    ).toThrow("No user-facing changes");
  });

  it("tags the initial version when no release tags exist", () => {
    const tagged = fakeDeps({ tags: "" });
    release({ dryRun: false, title: null }, tagged.deps);
    expect(tagged.calls.at(-1)).toEqual(["git", "tag", "-a", INITIAL_TAG, "-m", `Release ${INITIAL_TAG}`]);
    expect(tagged.writes).toEqual([]);

    const preview = fakeDeps({ tags: "" });
    release({ dryRun: true, title: null }, preview.deps);
    expect(preview.logs).toEqual([`Dry run: would tag ${INITIAL_TAG} for the initial version.`]);

    expect(() =>
      release({ dryRun: false, title: null }, fakeDeps({ tags: "", changelog: `${CHANGELOG_TITLE}\n` }).deps),
    ).toThrow('has no "## [Initial Version]" entry');
    expect(() => release({ dryRun: false, title: "Launch" }, fakeDeps({ tags: "" }).deps)).toThrow(
      "--title is not used for the initial version.",
    );
  });
});

describe("main", () => {
  it("returns exit codes and reports errors", () => {
    expect(main(["--dry-run"], fakeDeps().deps)).toBe(0);

    const invalid = fakeDeps();
    expect(main(["--nope"], invalid.deps)).toBe(1);
    expect(invalid.errors[0]).toMatch(/^Unknown option: --nope/);

    const crashed = fakeDeps({ failWith: "git exploded" });
    expect(main([], crashed.deps)).toBe(1);
    expect(crashed.errors).toEqual(["git exploded"]);
  });
});

describe("release script end to end", () => {
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const script = join(repoRoot, "scripts", "release.mts");
  const binPath = join(repoRoot, "node_modules", ".bin");

  it("releases a fix with the real git and git-cliff binaries", () => {
    const dir = mkdtempSync(join(tmpdir(), "ebook-hub-release-"));
    const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
    try {
      git("init", "-q", "-b", "main");
      git("config", "user.name", "Release Test");
      git("config", "user.email", "release@example.com");
      git("config", "commit.gpgsign", "false");
      git("config", "tag.gpgsign", "false");
      copyFileSync(join(repoRoot, "cliff.toml"), join(dir, "cliff.toml"));
      writeFileSync(join(dir, "CHANGELOG.md"), CHANGELOG);
      git("add", ".");
      git("commit", "-q", "-m", "feat: initial reader");

      const env = { ...process.env, PATH: `${binPath}${delimiter}${process.env.PATH ?? ""}` };
      const runScript = (...args: string[]) =>
        spawnSync(process.execPath, [script, ...args], { cwd: dir, env, encoding: "utf8" });

      const initial = runScript();
      expect(initial.status, initial.stderr).toBe(0);
      expect(git("tag", "--list")).toBe("v1.0.0");

      git("commit", "-q", "--allow-empty", "-m", "test: add coverage");
      git("commit", "-q", "--allow-empty", "-m", "fix(reader): keep bookmarks after deletion");

      const released = runScript();
      expect(released.status, released.stderr).toBe(0);
      expect(readFileSync(join(dir, "CHANGELOG.md"), "utf8")).toBe(
        `${CHANGELOG_TITLE}\n\n## [1.0.1] - {PR_MERGE_DATE}\n\n- Keep bookmarks after deletion\n\n## [Initial Version] - {PR_MERGE_DATE}\n\n- First release\n`,
      );
      expect(git("log", "-1", "--format=%s")).toBe("chore(release): v1.0.1");
      expect(git("tag", "--list", "--sort=-v:refname").split("\n")[0]).toBe("v1.0.1");

      const nothing = runScript();
      expect(nothing.status).toBe(1);
      expect(nothing.stderr).toContain("No user-facing changes");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
