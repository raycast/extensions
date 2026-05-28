// test/aggregate.test.ts
import { describe, it, expect } from "vitest";
import { aggregateSkills } from "../src/lib/aggregate";
import type { ParsedSkill } from "../src/lib/types";

function skill(over: Partial<ParsedSkill>): ParsedSkill {
  return {
    id: Math.random().toString(36).slice(2),
    name: "x",
    description: "",
    surface: "claude",
    source: "claude-user",
    entryPath: "/e",
    realPath: "/r",
    isSymlink: false,
    isBroken: false,
    skillMdExists: true,
    frontmatter: {},
    body: "",
    fileMtime: 0,
    triggerHints: [],
    keywords: [],
    ...over,
  };
}

describe("aggregateSkills", () => {
  it("merges identical realPath across surfaces into one row with both surfaces", () => {
    const out = aggregateSkills([
      skill({ name: "firecrawl", realPath: "/repo/firecrawl", surface: "claude" }),
      skill({ name: "firecrawl", realPath: "/repo/firecrawl", surface: "codex" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].surfaces.sort()).toEqual(["claude", "codex"]);
  });

  it("keeps same name but different realPath as separate rows", () => {
    const out = aggregateSkills([
      skill({ name: "dup", realPath: "/a" }),
      skill({ name: "dup", realPath: "/b" }),
    ]);
    expect(out).toHaveLength(2);
  });

  it("collapses cache versions to the latest", () => {
    const out = aggregateSkills([
      skill({ name: "tighten", realPath: "/c/1.0", source: "claude-plugin-cache", marketplace: "rw", pluginVersion: "1.0.0" }),
      skill({ name: "tighten", realPath: "/c/2.0", source: "claude-plugin-cache", marketplace: "rw", pluginVersion: "2.0.0" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].primary.pluginVersion).toBe("2.0.0");
  });

  it("drops cache entry when a non-cache entry of same name exists", () => {
    const out = aggregateSkills([
      skill({ name: "brainstorming", realPath: "/mp", source: "claude-plugin-marketplace", marketplace: "sp" }),
      skill({ name: "brainstorming", realPath: "/cache", source: "claude-plugin-cache", marketplace: "sp", pluginVersion: "5.0.0" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe("claude-plugin-marketplace");
  });

  it("sorts by name", () => {
    const out = aggregateSkills([skill({ name: "zeta", realPath: "/z" }), skill({ name: "alpha", realPath: "/a" })]);
    expect(out.map((s) => s.name)).toEqual(["alpha", "zeta"]);
  });
});
