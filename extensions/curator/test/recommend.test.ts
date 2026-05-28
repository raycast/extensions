import { describe, it, expect } from "vitest";
import {
  buildCatalog,
  buildPrompt,
  parseRecommendations,
  resolveRecommendations,
} from "../src/lib/recommend";
import { firstSentence } from "../src/lib/text";
import type { DisplaySkill, ParsedSkill, SourceType } from "../src/lib/types";

function ds(
  name: string,
  opts: { description?: string; triggers?: string[]; source?: SourceType; marketplace?: string } = {},
): DisplaySkill {
  const realPath = "/r/" + name;
  const primary: ParsedSkill = {
    id: name,
    name,
    description: opts.description ?? "",
    surface: "claude",
    source: opts.source ?? "claude-user",
    marketplace: opts.marketplace,
    entryPath: realPath,
    realPath,
    isSymlink: false,
    isBroken: false,
    skillMdExists: true,
    frontmatter: {},
    body: "",
    fileMtime: 0,
    triggerHints: opts.triggers ?? [],
    keywords: [],
  };
  return {
    key: realPath,
    name,
    description: opts.description ?? "",
    surfaces: ["claude"],
    source: opts.source ?? "claude-user",
    marketplace: opts.marketplace,
    keywords: [],
    primary,
  };
}

describe("firstSentence", () => {
  it("cuts at the first terminator", () => {
    expect(firstSentence("Scrape the web. More text.")).toBe("Scrape the web.");
    expect(firstSentence("抓网页。第二句。")).toBe("抓网页。");
  });
  it("falls back to 80 chars when no terminator", () => {
    expect(firstSentence("x".repeat(100)).length).toBe(80);
  });
});

describe("buildCatalog", () => {
  it("compacts: first-sentence desc, <=4 triggers, source label", () => {
    const cat = buildCatalog([
      ds("firecrawl", {
        description: "Scrape the web. Second.",
        triggers: ["a", "b", "c", "d", "e", "f"],
        source: "claude-plugin-marketplace",
        marketplace: "sp",
      }),
      ds("mine", { description: "Local thing.", source: "claude-user" }),
    ]);
    expect(cat[0]).toEqual({ name: "firecrawl", desc: "Scrape the web.", triggers: ["a", "b", "c", "d"], source: "sp" });
    expect(cat[1].source).toBe("user");
  });
});

describe("buildPrompt", () => {
  it("includes the query and every catalog name and the JSON contract", () => {
    const cat = buildCatalog([ds("alpha", { description: "A." }), ds("beta", { description: "B." })]);
    const p = buildPrompt("do a thing", cat);
    expect(p).toContain('"do a thing"');
    expect(p).toContain("alpha");
    expect(p).toContain("beta");
    expect(p).toContain('"confidence"');
  });
});

describe("parseRecommendations", () => {
  it("parses a clean JSON array", () => {
    const r = parseRecommendations('[{"name":"a","confidence":"high","why":"r"}]');
    expect(r).toEqual([{ name: "a", confidence: "high", why: "r" }]);
  });
  it("extracts JSON wrapped in prose", () => {
    const r = parseRecommendations('Sure:\n[{"name":"a","confidence":"low","why":"x"}]\nDone');
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe("a");
  });
  it("extracts JSON from a fenced block", () => {
    const r = parseRecommendations('```json\n[{"name":"b","confidence":"medium","why":""}]\n```');
    expect(r[0].name).toBe("b");
  });
  it("defaults missing confidence/why", () => {
    const r = parseRecommendations('[{"name":"a"}]');
    expect(r[0]).toEqual({ name: "a", confidence: "medium", why: "" });
  });
  it("returns [] for object-not-array, invalid json, and garbage", () => {
    expect(parseRecommendations('{"name":"a"}')).toEqual([]);
    expect(parseRecommendations("[{name: a}]")).toEqual([]);
    expect(parseRecommendations("no json here")).toEqual([]);
  });
});

describe("resolveRecommendations", () => {
  const skills = [ds("alpha"), ds("beta"), ds("gamma")];
  it("drops hallucinated names not in the catalog", () => {
    const out = resolveRecommendations(
      [{ name: "alpha", confidence: "high", why: "" }, { name: "ghost", confidence: "high", why: "" }],
      skills,
    );
    expect(out.map((r) => r.skill.name)).toEqual(["alpha"]);
  });
  it("dedupes by skill and is case-insensitive", () => {
    const out = resolveRecommendations(
      [{ name: "Alpha", confidence: "high", why: "" }, { name: "alpha", confidence: "low", why: "" }],
      skills,
    );
    expect(out).toHaveLength(1);
  });
  it("normalizes confidence", () => {
    const out = resolveRecommendations(
      [
        { name: "alpha", confidence: "High", why: "" },
        { name: "beta", confidence: "l", why: "" },
        { name: "gamma", confidence: "weird", why: "" },
      ],
      skills,
    );
    expect(out.map((r) => r.confidence)).toEqual(["high", "low", "medium"]);
  });
  it("clamps to 5", () => {
    const many = Array.from({ length: 8 }, (_, i) => ds("s" + i));
    const raw = many.map((s) => ({ name: s.name, confidence: "high", why: "" }));
    expect(resolveRecommendations(raw, many)).toHaveLength(5);
  });
});
