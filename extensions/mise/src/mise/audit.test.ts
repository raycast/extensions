import { describe, expect, it, vi } from "vitest";
import { fixedVersion, listVulnerabilities, parseAudit, severityName } from "./audit";
import * as exec from "./exec";
import { MiseOutputError } from "./exec";
import fixture from "./fixtures/audit.json";

describe("parseAudit", () => {
  const vulnerable = parseAudit(fixture);

  it("groups the advisories of one tool version into one entry", () => {
    expect(vulnerable.map((v) => [v.tool, v.version, v.advisories.length])).toEqual([
      ["npm:lodash", "4.17.15", 3],
      ["jq", "1.8.1", 2],
    ]);
  });

  it("takes the highest severity", () => {
    expect(vulnerable[0].severity).toBe("high");
  });

  it("leaves severity out when no advisory has one", () => {
    expect(vulnerable[1].severity).toBeUndefined();
    expect(vulnerable[1].advisories[1]).toEqual({
      id: "CVE-2026-0002",
      aliases: ["GHSA-aaaa-bbbb-cccc"],
      summary: "Stack exhaustion on deeply nested input",
      fixed: [],
      url: "https://osv.dev/vulnerability/CVE-2026-0002",
    });
  });

  it("returns nothing for a clean audit", () => {
    expect(parseAudit({ vulnerabilities: [], unchecked: [{ tool: "node", version: "26.13.0" }] })).toEqual([]);
  });

  it("keeps the tool version of an advisory with unreadable fields, and the rest", () => {
    const raw = {
      vulnerabilities: [
        fixture.vulnerabilities[0],
        { tool: "jq", version: "1.8.1", id: 7, aliases: "x", severity: "bogus", fixed: null },
        { version: "1" },
        "junk",
      ],
    };
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = parseAudit(raw);
    expect(result.map((v) => v.tool)).toEqual(["npm:lodash", "jq"]);
    expect(result[1].advisories).toEqual([{ id: "unknown", aliases: [], summary: "", fixed: [] }]);
    expect(log).toHaveBeenCalledTimes(2);
  });

  it("rejects output that is not an audit report", () => {
    expect(() => parseAudit([])).toThrow(MiseOutputError);
    expect(() => parseAudit({})).toThrow(MiseOutputError);
  });
});

describe("fixedVersion", () => {
  const fixes = (...lists: string[][]) => lists.map((fixed) => ({ id: "x", aliases: [], summary: "", fixed }));

  it("names the first release that fixes every advisory, not the lowest fix of any one", () => {
    expect(fixedVersion(parseAudit(fixture)[0])).toBe("4.17.21");
    expect(fixedVersion({ version: "4.17.15", advisories: fixes(["4.17.10", "4.17.19"], ["4.17.21"]) })).toBe(
      "4.17.21",
    );
  });

  it("names nothing when any advisory lacks a release fix above the installed version", () => {
    expect(fixedVersion({ version: "4.17.15", advisories: fixes(["4.17.21"], []) })).toBeUndefined();
    expect(fixedVersion({ version: "4.17.15", advisories: fixes(["4.17.21"], ["abc123"]) })).toBeUndefined();
    expect(fixedVersion({ version: "4.17.15", advisories: fixes(["4.17.10"]) })).toBeUndefined();
    expect(fixedVersion({ version: "1.8.1-rc1", advisories: fixes(["1.9.0"]) })).toBeUndefined();
  });
});

describe("severityName", () => {
  it("calls a missing severity unknown", () => {
    expect(severityName(undefined)).toBe("unknown");
    expect(severityName("high")).toBe("high");
  });
});

describe("listVulnerabilities", () => {
  it("runs mise audit and accepts exit 1, which mise uses to report advisories", async () => {
    const miseJson = vi.spyOn(exec, "miseJson").mockImplementation(async (_l, _a, parse) => parse(fixture, ""));
    expect(
      await listVulnerabilities({ path: "mise", env: { PATH: "/bin", MISE_YES: "1", NO_COLOR: "1" } }),
    ).toHaveLength(2);
    expect(miseJson).toHaveBeenCalledWith(expect.anything(), ["audit"], parseAudit, { okCodes: [1] });
  });
});
