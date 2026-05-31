import { describe, expect, it } from "vitest";
import { issuesForSkill } from "../src/lib/issue-scope";
import type { DisplaySkill, HealthIssue, ParsedSkill } from "../src/lib/types";

function parsed(over: Partial<ParsedSkill>): ParsedSkill {
  return {
    id: "id",
    name: "formatter",
    description: "",
    surface: "claude",
    source: "claude-user",
    entryPath: "/skills/formatter",
    realPath: "/repo/formatter",
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

function display(primary: ParsedSkill): DisplaySkill {
  return {
    key: primary.realPath,
    name: primary.name,
    description: primary.description,
    surfaces: [primary.surface],
    source: primary.source,
    keywords: [],
    primary,
  };
}

function issue(over: Partial<HealthIssue>): HealthIssue {
  return {
    id: "H2:id",
    check: "H2",
    severity: "error",
    skillName: "formatter",
    message: "SKILL.md missing",
    affectedPaths: [],
    meta: {},
    ...over,
  };
}

describe("issuesForSkill", () => {
  it("matches issues by affected path instead of skill name", () => {
    const healthy = display(parsed({ realPath: "/repo/healthy" }));
    const broken = display(parsed({ realPath: "/repo/broken" }));
    const issues = [
      issue({ id: "H2:broken", affectedPaths: ["/repo/broken"] }),
    ];

    expect(issuesForSkill(healthy, issues)).toEqual([]);
    expect(issuesForSkill(broken, issues).map((i) => i.id)).toEqual([
      "H2:broken",
    ]);
  });

  it("matches broken symlink issues by entry path", () => {
    const skill = display(
      parsed({
        entryPath: "/surface/link",
        realPath: "/surface/link",
        isSymlink: true,
        isBroken: true,
      }),
    );
    const issues = [
      issue({
        id: "H1:link",
        check: "H1",
        affectedPaths: ["/surface/link"],
      }),
    ];

    expect(issuesForSkill(skill, issues).map((i) => i.id)).toEqual(["H1:link"]);
  });
});
