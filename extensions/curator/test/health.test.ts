// test/health.test.ts
import { describe, it, expect } from "vitest";
import { computeHealth } from "../src/lib/health";
import type { ParsedSkill } from "../src/lib/types";

function skill(over: Partial<ParsedSkill>): ParsedSkill {
  return {
    id: Math.random().toString(36).slice(2),
    name: "x",
    description: "",
    surface: "claude",
    source: "claude-user",
    entryPath: "/e",
    realPath: "/r/x",
    isSymlink: false,
    isBroken: false,
    skillMdExists: true,
    frontmatter: { name: "x" },
    body: "",
    fileMtime: 0,
    triggerHints: [],
    keywords: [],
    ...over,
  };
}
const HOME = "/home/u";

describe("computeHealth", () => {
  it("H1: flags broken symlink", () => {
    const issues = computeHealth([skill({ name: "ghost", isSymlink: true, isBroken: true })], HOME);
    expect(issues.find((i) => i.check === "H1")?.severity).toBe("error");
  });

  it("H2: flags missing SKILL.md", () => {
    const issues = computeHealth([skill({ name: "nomd", skillMdExists: false })], HOME);
    expect(issues.find((i) => i.check === "H2")).toBeDefined();
  });

  it("H2: flags parse error", () => {
    const issues = computeHealth([skill({ name: "bad", parseError: "yaml error: boom" })], HOME);
    expect(issues.find((i) => i.check === "H2")?.message).toMatch(/unparseable/i);
  });

  it("H3: flags name != directory", () => {
    const issues = computeHealth(
      [skill({ name: "aliyun-model-studio-cli", realPath: "/r/bailian-cli", frontmatter: { name: "aliyun-model-studio-cli" } })],
      HOME,
    );
    const h3 = issues.find((i) => i.check === "H3");
    expect(h3?.meta.expectedName).toBe("aliyun-model-studio-cli");
    expect(h3?.meta.currentDir).toBe("bailian-cli");
  });

  it("H4: flags skill present only in Claude when Codex is in use", () => {
    const issues = computeHealth(
      [
        skill({ name: "onlyclaude", surface: "claude", source: "claude-user", realPath: "/r/onlyclaude" }),
        skill({ name: "shared", surface: "codex", source: "codex-user", realPath: "/r/shared" }),
      ],
      HOME,
    );
    const h4 = issues.find((i) => i.check === "H4" && i.skillName === "onlyclaude");
    expect(h4?.meta.targetSurface).toBe("codex");
    expect(h4?.meta.targetDir).toBe("/home/u/.codex/skills/onlyclaude");
  });

  it("H4: does not flag plugin skills for single-surface", () => {
    const issues = computeHealth(
      [skill({ name: "p", source: "claude-plugin-marketplace", realPath: "/r/p" })],
      HOME,
    );
    expect(issues.find((i) => i.check === "H4")).toBeUndefined();
  });

  it("H5: flags stale cache versions", () => {
    const issues = computeHealth(
      [
        skill({ name: "t", source: "claude-plugin-cache", marketplace: "rw", pluginVersion: "1.0.0", realPath: "/c/1" }),
        skill({ name: "t", source: "claude-plugin-cache", marketplace: "rw", pluginVersion: "2.0.0", realPath: "/c/2" }),
      ],
      HOME,
    );
    const h5 = issues.find((i) => i.check === "H5");
    expect(h5?.severity).toBe("info");
    expect(h5?.affectedPaths).toContain("/c/1");
  });
});
