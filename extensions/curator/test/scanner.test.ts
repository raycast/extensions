// test/scanner.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanSkills } from "../src/lib/scanner";

let home: string;
let srcRepo: string;

beforeAll(async () => {
  home = await mkdtemp(join(tmpdir(), "skm-home-"));
  srcRepo = await mkdtemp(join(tmpdir(), "skm-src-"));

  // a real source skill
  const fc = join(srcRepo, "firecrawl");
  await mkdir(fc, { recursive: true });
  await writeFile(join(fc, "SKILL.md"), "---\nname: firecrawl\ndescription: Scrape\n---\nbody");

  // claude user: symlink to source
  await mkdir(join(home, ".claude/skills"), { recursive: true });
  await symlink(fc, join(home, ".claude/skills/firecrawl"));

  // claude user: broken symlink
  await symlink(join(srcRepo, "does-not-exist"), join(home, ".claude/skills/ghost"));

  // codex user: same source (shared) → drift-free
  await mkdir(join(home, ".codex/skills"), { recursive: true });
  await symlink(fc, join(home, ".codex/skills/firecrawl"));

  // claude plugin marketplace
  const mp = join(home, ".claude/plugins/marketplaces/superpowers/skills/brainstorming");
  await mkdir(mp, { recursive: true });
  await writeFile(join(mp, "SKILL.md"), "---\nname: brainstorming\ndescription: ideas\n---\nb");
});

afterAll(async () => {
  await rm(home, { recursive: true, force: true });
  await rm(srcRepo, { recursive: true, force: true });
});

describe("scanSkills", () => {
  it("finds user, plugin, and broken-symlink entries", async () => {
    const entries = await scanSkills(home);
    const byName = (p: string) => entries.filter((e) => e.entryPath.endsWith(p));

    expect(byName("/firecrawl").length).toBe(2); // claude + codex
    expect(entries.find((e) => e.source === "claude-plugin-marketplace")?.marketplace).toBe("superpowers");

    const ghost = entries.find((e) => e.entryPath.endsWith("/ghost"));
    expect(ghost?.isBroken).toBe(true);
    expect(ghost?.skillMdExists).toBe(false);

    const fc = entries.find((e) => e.source === "claude-user" && e.entryPath.endsWith("/firecrawl"));
    expect(fc?.isSymlink).toBe(true);
    expect(fc?.skillMdExists).toBe(true);
    expect(fc?.fileMtime).toBeTypeOf("number");
  });

  it("returns empty for a home with no skill dirs", async () => {
    const empty = await mkdtemp(join(tmpdir(), "skm-empty-"));
    expect(await scanSkills(empty)).toEqual([]);
    await rm(empty, { recursive: true, force: true });
  });
});
