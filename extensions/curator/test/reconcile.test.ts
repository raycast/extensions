// test/reconcile.test.ts
import { describe, it, expect, vi } from "vitest";
import { reconcileIndex } from "../src/lib/reconcile";
import { skillId } from "../src/lib/parser";
import type { ParsedSkill, RawSkillEntry, SkillIndex } from "../src/lib/types";

function entry(realPath: string, mtime: number | null, over: Partial<RawSkillEntry> = {}): RawSkillEntry {
  return {
    entryPath: realPath,
    realPath,
    isSymlink: false,
    isBroken: false,
    skillMdExists: true,
    surface: "claude",
    source: "claude-user",
    fileMtime: mtime,
    ...over,
  };
}

function cachedSkill(realPath: string, mtime: number): ParsedSkill {
  return {
    id: skillId(realPath),
    name: "cached",
    description: "",
    surface: "claude",
    source: "claude-user",
    entryPath: realPath,
    realPath,
    isSymlink: false,
    isBroken: false,
    skillMdExists: true,
    frontmatter: {},
    body: "",
    fileMtime: mtime,
    triggerHints: [],
    keywords: [],
  };
}

describe("reconcileIndex", () => {
  it("reuses cached skill when mtime unchanged, parses only changed", async () => {
    const cached: SkillIndex = {
      scannedAt: 1,
      skills: [cachedSkill("/a", 100), cachedSkill("/b", 200)],
    };
    const parse = vi.fn(async (e: RawSkillEntry) => ({ ...cachedSkill(e.realPath, e.fileMtime ?? 0), name: "fresh" }));

    const out = await reconcileIndex({
      scanned: [entry("/a", 100), entry("/b", 999)], // /a unchanged, /b changed
      cached,
      parse,
    });

    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse).toHaveBeenCalledWith(expect.objectContaining({ realPath: "/b" }));
    expect(out.skills.find((s) => s.realPath === "/a")?.name).toBe("cached");
    expect(out.skills.find((s) => s.realPath === "/b")?.name).toBe("fresh");
  });

  it("parses everything when cache is null", async () => {
    const parse = vi.fn(async (e: RawSkillEntry) => cachedSkill(e.realPath, 0));
    const out = await reconcileIndex({ scanned: [entry("/a", 1), entry("/b", 2)], cached: null, parse });
    expect(parse).toHaveBeenCalledTimes(2);
    expect(out.skills).toHaveLength(2);
  });

  it("always re-parses broken entries even if mtime matches", async () => {
    const cached: SkillIndex = { scannedAt: 1, skills: [cachedSkill("/a", 100)] };
    const parse = vi.fn(async (e: RawSkillEntry) => cachedSkill(e.realPath, 0));
    await reconcileIndex({ scanned: [entry("/a", 100, { isBroken: true })], cached, parse });
    expect(parse).toHaveBeenCalledTimes(1);
  });
});
