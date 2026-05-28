// test/parser.test.ts
import { describe, it, expect } from "vitest";
import { skillId, splitFrontmatter, extractTriggerHints, tokenizeKeywords, parseEntry } from "../src/lib/parser";
import type { RawSkillEntry } from "../src/lib/types";

function entry(over: Partial<RawSkillEntry> = {}): RawSkillEntry {
  return {
    entryPath: "/home/.claude/skills/firecrawl",
    realPath: "/repo/skills/firecrawl",
    isSymlink: true,
    isBroken: false,
    skillMdExists: true,
    surface: "claude",
    source: "claude-user",
    fileMtime: 123,
    ...over,
  };
}

describe("splitFrontmatter", () => {
  it("splits valid frontmatter and body", () => {
    const r = splitFrontmatter('---\nname: foo\ndescription: bar\n---\nHello body');
    expect(r.frontmatter).toEqual({ name: "foo", description: "bar" });
    expect(r.body).toBe("Hello body");
    expect(r.error).toBeUndefined();
  });
  it("reports error when no frontmatter", () => {
    const r = splitFrontmatter("just text");
    expect(r.error).toBeDefined();
    expect(r.body).toBe("just text");
  });
  it("reports error on invalid yaml", () => {
    const r = splitFrontmatter("---\nname: : :\n---\nbody");
    expect(r.error).toMatch(/yaml/i);
  });
});

describe("extractTriggerHints", () => {
  it("captures quoted phrases", () => {
    expect(extractTriggerHints('Use when user says "scrape", "grab this"')).toEqual(
      expect.arrayContaining(["scrape", "grab this"]),
    );
  });
  it("captures trigger words list", () => {
    expect(extractTriggerHints("Trigger words: alpha, beta, gamma")).toEqual(
      expect.arrayContaining(["alpha", "beta", "gamma"]),
    );
  });
});

describe("tokenizeKeywords", () => {
  it("lowercases, splits, drops 1-char tokens", () => {
    const k = tokenizeKeywords("Scrape a URL, 抓网页 fast");
    expect(k).toContain("scrape");
    expect(k).toContain("url");
    expect(k).toContain("抓网页");
    expect(k).not.toContain("a");
  });
});

describe("skillId", () => {
  it("is stable for the same path", () => {
    expect(skillId("/x/y")).toBe(skillId("/x/y"));
    expect(skillId("/x/y")).not.toBe(skillId("/x/z"));
  });
});

describe("parseEntry", () => {
  it("parses a normal skill", () => {
    const md = "---\nname: firecrawl\ndescription: Scrape the web\n---\nBody text";
    const s = parseEntry(entry(), md);
    expect(s.name).toBe("firecrawl");
    expect(s.description).toBe("Scrape the web");
    expect(s.body).toBe("Body text");
    expect(s.parseError).toBeUndefined();
    expect(s.id).toBe(skillId("/repo/skills/firecrawl"));
  });
  it("falls back to dir name when frontmatter.name missing", () => {
    const s = parseEntry(entry(), "---\ndescription: x\n---\nbody");
    expect(s.name).toBe("firecrawl"); // basename of realPath
  });
  it("marks broken symlink", () => {
    const s = parseEntry(entry({ isBroken: true }), null);
    expect(s.parseError).toMatch(/broken/i);
  });
  it("marks missing SKILL.md", () => {
    const s = parseEntry(entry({ skillMdExists: false }), null);
    expect(s.parseError).toMatch(/missing/i);
  });
  it("truncates body to 2KB", () => {
    const big = "x".repeat(5000);
    const s = parseEntry(entry(), `---\nname: a\n---\n${big}`);
    expect(s.body.length).toBe(2048);
  });
});
