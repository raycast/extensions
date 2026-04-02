import { homedir } from "os";
import { describe, expect, it } from "vitest";
import { parseSkillsList, stripAnsi } from "./skills-cli";

describe("stripAnsi", () => {
  it("removes ANSI escape codes", () => {
    expect(stripAnsi("\u001b[32mhello\u001b[0m")).toBe("hello");
  });

  it("returns plain text unchanged", () => {
    expect(stripAnsi("plain text")).toBe("plain text");
  });
});

describe("parseSkillsList", () => {
  const currentHome = homedir();

  it("parses skills with home-relative paths and truncated agents", () => {
    const output = [
      "Global Skills",
      "",
      "\u001b[36mskill-one\u001b[0m ~/.agents/skills/skill-one",
      "Agents: Claude Code, Codex, Continue +16 more",
      "skill-two /tmp/skills/skill-two",
      "Agents: Cline",
    ].join("\n");

    expect(parseSkillsList(output)).toEqual([
      {
        name: "skill-one",
        path: `${currentHome}/.agents/skills/skill-one`,
        agents: ["Claude Code", "Codex", "Continue"],
        agentCount: 19,
      },
      {
        name: "skill-two",
        path: "/tmp/skills/skill-two",
        agents: ["Cline"],
        agentCount: 1,
      },
    ]);
  });

  it("handles entries without an Agents line", () => {
    expect(parseSkillsList("skill-one /tmp/skills/skill-one")).toEqual([
      {
        name: "skill-one",
        path: "/tmp/skills/skill-one",
        agents: [],
        agentCount: 0,
      },
    ]);
  });
});
