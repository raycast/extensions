// test/fix-commands.test.ts
import { describe, it, expect } from "vitest";
import { buildFixCommand } from "../src/lib/fix-commands";
import type { HealthIssue } from "../src/lib/types";

function issue(over: Partial<HealthIssue>): HealthIssue {
  return {
    id: "i",
    check: "H1",
    severity: "error",
    skillName: "x",
    message: "",
    affectedPaths: [],
    meta: {},
    ...over,
  };
}

describe("buildFixCommand", () => {
  it("H1 → rm of the broken symlink", () => {
    const cmd = buildFixCommand(issue({ check: "H1", meta: { entryPath: "/h/.claude/skills/ghost" } }));
    expect(cmd).toContain('rm "/h/.claude/skills/ghost"');
  });

  it("H3 → both rename options", () => {
    const cmd = buildFixCommand(
      issue({ check: "H3", meta: { realPath: "/r/bailian-cli", expectedName: "aliyun-model-studio-cli", currentDir: "bailian-cli" } }),
    );
    expect(cmd).toContain('mv "/r/bailian-cli" "/r/aliyun-model-studio-cli"');
    expect(cmd).toMatch(/Option B/);
  });

  it("H4 missing → ln -s into target surface dir", () => {
    const cmd = buildFixCommand(
      issue({ check: "H4", meta: { realPath: "/repo/firecrawl", targetSurface: "codex", targetDir: "/h/.codex/skills/firecrawl" } }),
    );
    expect(cmd).toBe('ln -s "/repo/firecrawl" "/h/.codex/skills/firecrawl"');
  });

  it("H4 diverged → diff", () => {
    const cmd = buildFixCommand(issue({ check: "H4", meta: { claudePath: "/a", codexPath: "/b" } }));
    expect(cmd).toContain('diff -r "/a" "/b"');
  });

  it("H5 → rm -rf each stale path", () => {
    const cmd = buildFixCommand(issue({ check: "H5", severity: "info", meta: { paths: "/c/1\n/c/2" } }));
    expect(cmd).toContain('rm -rf "/c/1"');
    expect(cmd).toContain('rm -rf "/c/2"');
  });
});
