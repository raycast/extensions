import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import * as exec from "./exec";
import { MiseOutputError } from "./exec";
import { listOutdated, outdatedSubtitle, outdatedVersions, parseOutdated, parseUnchecked } from "./outdated";
import fixture from "./fixtures/outdated.json";
import inactiveFixture from "./fixtures/outdated-inactive.json";
import notInstalledFixture from "./fixtures/outdated-not-installed.json";

// mise 2026.11.0's stderr from `mise outdated --json` when two asdf plugins' list-all failed.
const uncheckedStderr = readFileSync(join(__dirname, "fixtures/outdated-unchecked-stderr.txt"), "utf8");

describe("parseOutdated", () => {
  const { tools } = parseOutdated(fixture);

  it("keeps the tool names as mise outdated keys, backend prefixes included", () => {
    expect(tools.map((t) => t.name)).toEqual(["gh", "npm:wrangler", "opencode", "usage"]);
  });

  it("maps requested, current, latest, release URL and source path", () => {
    expect(tools[0]).toEqual({
      name: "gh",
      requested: "latest",
      current: "2.100.0",
      latest: "2.101.0",
      releaseUrl: "https://github.com/cli/cli/releases/tag/v2.101.0",
      sourcePath: "/Users/lachlan/.config/mise/config.local.toml",
    });
  });

  it("leaves releaseUrl out when a backend does not report it", () => {
    const wrangler = tools.find((t) => t.name === "npm:wrangler");
    expect(wrangler).toMatchObject({ latest: "4.131.2" });
    expect(wrangler).not.toHaveProperty("releaseUrl");
  });

  it("leaves sourcePath out for the inactive installs --inactive adds, whose source is unknown", () => {
    const [gh, jq] = parseOutdated(inactiveFixture).tools;
    expect(gh).toEqual({
      name: "gh",
      requested: "2.99.0",
      current: "2.99.0",
      latest: "2.101.0",
      releaseUrl: "https://github.com/cli/cli/releases/tag/v2.101.0",
    });
    expect(jq).not.toHaveProperty("sourcePath");
  });

  it("leaves current out when mise reports null because the requested version is not installed", () => {
    expect(parseOutdated(notInstalledFixture).tools).toEqual([
      {
        name: "jq",
        requested: "1.7",
        latest: "1.7",
        releaseUrl: "https://github.com/jqlang/jq/releases/tag/jq-1.7",
        sourcePath: "/tmp/mise-issue7/config/config.toml",
      },
      { name: "node", requested: "lts", latest: "26.13.0", sourcePath: "/tmp/mise-issue7/config/config.toml" },
    ]);
  });

  it("returns empty lists when nothing is outdated and mise warned about nothing", () => {
    expect(parseOutdated({}, "")).toEqual({ tools: [], unchecked: [] });
  });

  it("reports the tools named in the stderr warning even though the JSON is empty", () => {
    expect(parseOutdated({}, uncheckedStderr)).toEqual({
      tools: [],
      unchecked: [
        { name: "asdf:unreachable", version: "1.0.0" },
        { name: "asdf:broken", version: "1.0.0" },
      ],
    });
  });

  it("keeps a malformed entry by name, logs it, and still parses the rest", () => {
    const [gh] = parseOutdated(fixture).tools;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const raw = { gh: fixture.gh, broken: { name: "broken", current: "1" }, nosource: { requested: "1", latest: "2" } };
    expect(parseOutdated(raw).tools).toEqual([
      gh,
      { name: "broken", malformed: true },
      { name: "nosource", malformed: true },
    ]);
    expect(log.mock.calls.map(([message]) => message)).toEqual([
      "mise outdated: broken is malformed",
      "mise outdated: nosource is malformed",
    ]);
  });

  it("throws MiseOutputError when the output is not an object keyed by tool", () => {
    expect(() => parseOutdated([])).toThrow(MiseOutputError);
    expect(() => parseOutdated(null)).toThrow(MiseOutputError);
  });
});

describe("outdatedVersions", () => {
  it("reads current → latest", () => {
    expect(outdatedVersions(parseOutdated(fixture).tools[0])).toBe("2.100.0 → 2.101.0");
  });

  it("reads not installed → latest when the requested version is not installed", () => {
    expect(outdatedVersions(parseOutdated(notInstalledFixture).tools[1])).toBe("not installed → 26.13.0");
  });

  it("says the entry could not be read when it is malformed", () => {
    expect(outdatedVersions({ name: "broken", malformed: true })).toBe("unreadable mise outdated entry");
  });
});

describe("parseUnchecked", () => {
  it("ignores the per-tool lookup errors and reads only the summary warning", () => {
    expect(parseUnchecked(uncheckedStderr).map((t) => t.name)).toEqual(["asdf:unreachable", "asdf:broken"]);
  });

  it("reads the singular form mise prints for one tool", () => {
    expect(parseUnchecked("mise WARN  Could not check 1 tool for updates: pypi:pre-commit@4.7.0\n")).toEqual([
      { name: "pypi:pre-commit", version: "4.7.0" },
    ]);
  });

  it("splits the version off at the last @, keeping a scoped npm package's name", () => {
    expect(parseUnchecked("mise WARN  Could not check 1 tool for updates: npm:@biomejs/biome@2.1.0")).toEqual([
      { name: "npm:@biomejs/biome", version: "2.1.0" },
    ]);
  });

  it("finds nothing in the stderr of an older mise, which prints no summary", () => {
    expect(parseUnchecked("")).toEqual([]);
    expect(
      parseUnchecked("mise WARN  Error getting latest version for gh: error sending request: client error (Connect)\n"),
    ).toEqual([]);
  });
});

describe("listOutdated", () => {
  const location = { path: "/bin/false", env: { PATH: "/bin", MISE_YES: "1", NO_COLOR: "1" } } as const;

  it("runs mise outdated with --bump and --inactive only when asked", async () => {
    const miseJson = vi.spyOn(exec, "miseJson").mockResolvedValue({ tools: [], unchecked: [] });
    await listOutdated(location);
    expect(miseJson).toHaveBeenLastCalledWith(location, ["outdated"], parseOutdated);
    await listOutdated(location, { bump: true, inactive: true });
    expect(miseJson).toHaveBeenLastCalledWith(location, ["outdated", "--bump", "--inactive"], parseOutdated);
    await listOutdated(location, { inactive: true });
    expect(miseJson).toHaveBeenLastCalledWith(location, ["outdated", "--inactive"], parseOutdated);
  });

  it("adds --global when asked", async () => {
    const miseJson = vi.spyOn(exec, "miseJson").mockResolvedValue([]);
    await listOutdated(location, { global: true, bump: true });
    expect(miseJson).toHaveBeenLastCalledWith(location, ["outdated", "--global", "--bump"], parseOutdated);
  });
});

describe("outdatedSubtitle", () => {
  const unchecked = [{ name: "asdf:unreachable", version: "1.0.0" }];

  it("reads 'All up to date' only when nothing is outdated and every tool was checked", () => {
    expect(outdatedSubtitle({ tools: [], unchecked: [] })).toBe("All up to date");
    expect(outdatedSubtitle({ tools: [], unchecked })).toBe("1 unchecked");
  });

  it("counts outdated tools, and unchecked ones beside them", () => {
    const { tools } = parseOutdated(fixture);
    expect(outdatedSubtitle({ tools: tools.slice(0, 1), unchecked: [] })).toBe("1 outdated");
    expect(outdatedSubtitle({ tools, unchecked: [] })).toBe("4 outdated");
    expect(outdatedSubtitle({ tools, unchecked })).toBe("4 outdated, 1 unchecked");
  });
});
