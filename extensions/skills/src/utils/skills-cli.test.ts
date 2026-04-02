import { describe, expect, it } from "vitest";
import { parseSkillsListJson, stripAnsi } from "./skills-cli";

describe("stripAnsi", () => {
  it("removes ANSI escape codes", () => {
    expect(stripAnsi("\u001b[32mhello\u001b[0m")).toBe("hello");
  });

  it("returns plain text unchanged", () => {
    expect(stripAnsi("plain text")).toBe("plain text");
  });
});

describe("parseSkillsListJson", () => {
  it("parses the JSON skills list output", () => {
    const output = JSON.stringify([
      {
        name: "skill-one",
        path: "~/.agents/skills/skill-one",
        scope: "global",
        agents: ["Claude Code", "Codex", "Continue"],
      },
      {
        name: "skill-two",
        path: "/tmp/skills/skill-two",
        scope: "global",
        agents: ["Cline"],
      },
    ]);

    expect(parseSkillsListJson(output)).toEqual([
      expect.objectContaining({
        name: "skill-one",
        agents: ["Claude Code", "Codex", "Continue"],
        agentCount: 3,
      }),
      {
        name: "skill-two",
        path: "/tmp/skills/skill-two",
        agents: ["Cline"],
        agentCount: 1,
      },
    ]);
  });

  it("throws when the payload is not an array", () => {
    expect(() => parseSkillsListJson(JSON.stringify({ skills: [] }))).toThrow("Expected JSON array");
  });

  it("maps entries without agents to an empty array", () => {
    expect(
      parseSkillsListJson(
        JSON.stringify([
          {
            name: "skill-one",
            path: "/tmp/skills/skill-one",
            scope: "global",
            agents: [],
          },
        ]),
      ),
    ).toEqual([
      {
        name: "skill-one",
        path: "/tmp/skills/skill-one",
        agents: [],
        agentCount: 0,
      },
    ]);
  });
});
