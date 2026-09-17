import { describe, expect, it } from "vitest";
import { MiseOutputError } from "./exec";
import { backendKind, parseRegistry } from "./registry";
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
