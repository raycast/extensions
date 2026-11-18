import { describe, expect, it } from "vitest";
import { MiseOutputError } from "./exec";
import { backendKind, filterRegistry, parseRegistry, type RegistryTool } from "./registry";
import fixture from "./fixtures/registry.json";

describe("parseRegistry", () => {
  const tools = parseRegistry(fixture);

  it("keeps every entry from mise registry --json", () => {
    expect(tools.map((t) => t.short)).toEqual(["jq", "1password", "node", "ripgrep", "ag"]);
  });

  it("normalizes missing aliases and bins to empty arrays", () => {
    const jq = tools.find((t) => t.short === "jq");
    expect(jq).toEqual({
      short: "jq",
      description: "Command-line JSON processor",
      backends: ["aqua:jqlang/jq", "asdf:mise-plugins/asdf-jq"],
      bins: ["jq"],
      aliases: [],
    });
    expect(tools.find((t) => t.short === "ag")?.bins).toEqual([]);
  });

  it("keeps aliases when present", () => {
    expect(tools.find((t) => t.short === "1password")?.aliases).toEqual(["1password-cli", "op"]);
  });

  it("throws MiseOutputError carrying the raw text on a shape mismatch", () => {
    expect(() => parseRegistry({ not: "an array" })).toThrow(MiseOutputError);
    expect(() => parseRegistry([{ short: "x" }])).toThrow(/entry 0/);
    try {
      parseRegistry([{ short: 42, backends: [] }]);
    } catch (error) {
      expect((error as MiseOutputError).raw).toBe('{"short":42,"backends":[]}');
    }
  });
});

describe("backendKind", () => {
  it("takes the scheme of the first backend", () => {
    const [jq, , node] = parseRegistry(fixture);
    expect(backendKind(jq)).toBe("aqua");
    expect(backendKind(node)).toBe("core");
  });
});

describe("filterRegistry", () => {
  const tool = (short: string, extra: Partial<RegistryTool> = {}): RegistryTool => ({
    short,
    description: "",
    backends: [`aqua:${short}`],
    bins: [],
    aliases: [],
    ...extra,
  });
  const tools = [
    tool("ripgrep", { bins: ["rg"], description: "Recursively search directories for a regex pattern" }),
    tool("rg-alias", { aliases: ["rg"] }),
    tool("borg", { description: "Deduplicating backup" }),
    tool("rgb"),
    tool("1password", { aliases: ["op"], bins: ["op"] }),
    tool("rg"),
    tool("grep-tools", { description: "rg wrappers" }),
  ];

  it("returns every tool for an empty or blank query", () => {
    expect(filterRegistry(tools, "", 2)).toBe(tools);
    expect(filterRegistry(tools, "   ", 2)).toBe(tools);
  });

  it("ranks an exact short first, then short prefixes, then alias and bin prefixes, then substrings", () => {
    expect(filterRegistry(tools, "rg", 50).map((t) => t.short)).toEqual([
      "rg",
      "rg-alias",
      "rgb",
      "ripgrep",
      "borg",
      "grep-tools",
    ]);
  });

  it("matches case-insensitively", () => {
    expect(filterRegistry(tools, "OP", 50).map((t) => t.short)).toEqual(["1password"]);
    expect(filterRegistry(tools, "Backup", 50).map((t) => t.short)).toEqual(["borg"]);
  });

  it("keeps registry order within a rank and caps at the limit", () => {
    expect(filterRegistry(tools, "r", 50).map((t) => t.short)).toEqual([
      "ripgrep",
      "rg-alias",
      "rgb",
      "rg",
      "borg",
      "1password",
      "grep-tools",
    ]);
    expect(filterRegistry(tools, "r", 3).map((t) => t.short)).toEqual(["ripgrep", "rg-alias", "rgb"]);
  });

  it("leaves out tools that match nowhere", () => {
    expect(filterRegistry(tools, "zzz", 50)).toEqual([]);
  });
});
