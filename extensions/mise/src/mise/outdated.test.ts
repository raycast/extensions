import { describe, expect, it, vi } from "vitest";
import * as exec from "./exec";
import { MiseOutputError } from "./exec";
import { listOutdated, outdatedSubtitle, parseOutdated } from "./outdated";
import fixture from "./fixtures/outdated.json";
import inactiveFixture from "./fixtures/outdated-inactive.json";

describe("parseOutdated", () => {
  const tools = parseOutdated(fixture);

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
    expect(wrangler?.latest).toBe("4.131.2");
    expect(wrangler).not.toHaveProperty("releaseUrl");
  });

  it("leaves sourcePath out for the inactive installs --inactive adds, whose source is unknown", () => {
    const [gh, jq] = parseOutdated(inactiveFixture);
    expect(gh).toEqual({
      name: "gh",
      requested: "2.99.0",
      current: "2.99.0",
      latest: "2.101.0",
      releaseUrl: "https://github.com/cli/cli/releases/tag/v2.101.0",
    });
    expect(jq).not.toHaveProperty("sourcePath");
  });

  it("returns an empty list when nothing is outdated", () => {
    expect(parseOutdated({})).toEqual([]);
  });

  it("throws MiseOutputError on a shape mismatch", () => {
    expect(() => parseOutdated([])).toThrow(MiseOutputError);
    expect(() => parseOutdated({ gh: { name: "gh", current: "2.100.0" } })).toThrow(/gh is malformed/);
    expect(() => parseOutdated({ gh: { requested: "latest", current: "1", latest: "2" } })).toThrow(MiseOutputError);
  });
});

describe("listOutdated", () => {
  const location = { path: "/bin/false", env: { PATH: "/bin", MISE_YES: "1", NO_COLOR: "1" } } as const;

  it("runs mise outdated with --bump and --inactive only when asked", async () => {
    const miseJson = vi.spyOn(exec, "miseJson").mockResolvedValue([]);
    await listOutdated(location);
    expect(miseJson).toHaveBeenLastCalledWith(location, ["outdated"], parseOutdated);
    await listOutdated(location, { bump: true, inactive: true });
    expect(miseJson).toHaveBeenLastCalledWith(location, ["outdated", "--bump", "--inactive"], parseOutdated);
    await listOutdated(location, { inactive: true });
    expect(miseJson).toHaveBeenLastCalledWith(location, ["outdated", "--inactive"], parseOutdated);
  });
});

describe("outdatedSubtitle", () => {
  it("reads 'All up to date' when nothing is outdated", () => {
    expect(outdatedSubtitle(0)).toBe("All up to date");
  });

  it("counts outdated tools", () => {
    expect(outdatedSubtitle(1)).toBe("1 outdated");
    expect(outdatedSubtitle(3)).toBe("3 outdated");
  });

  it("derives the count from the parsed list", () => {
    expect(outdatedSubtitle(parseOutdated(fixture).length)).toBe("4 outdated");
  });
});
