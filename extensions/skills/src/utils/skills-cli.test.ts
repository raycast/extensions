import { describe, expect, it } from "vitest";
import {
  NpxResolutionError,
  agentDisplayNameToId,
  normalizeCliError,
  parseSkillsListJson,
  stripAnsi,
} from "./skills-cli";

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

describe("normalizeCliError", () => {
  it("classifies a shell command-not-found error as npx resolution failure", () => {
    const error = new Error("command not found: npx");

    const normalized = normalizeCliError(error, "npx");

    expect(normalized).toBeInstanceOf(NpxResolutionError);
  });

  it("classifies a spawn ENOENT error as npx resolution failure", () => {
    const normalized = normalizeCliError(
      {
        message: "spawn /opt/homebrew/bin/npx ENOENT",
        code: "ENOENT",
      },
      "/opt/homebrew/bin/npx",
    );

    expect(normalized).toBeInstanceOf(NpxResolutionError);
  });

  it("classifies a Windows-style not-found error as npx resolution failure", () => {
    const error = new Error("'npx' is not recognized as an internal or external command");

    const normalized = normalizeCliError(error, "npx.exe");

    expect(normalized).toBeInstanceOf(NpxResolutionError);
  });

  it("returns regular Error instances unchanged when the failure is unrelated", () => {
    const error = new Error("skills list failed");

    expect(normalizeCliError(error, "npx")).toBe(error);
  });
});

describe("agentDisplayNameToId", () => {
  it("maps known agent display names to the expected CLI ids", () => {
    expect(agentDisplayNameToId("Claude Code")).toBe("claude-code");
    expect(agentDisplayNameToId("Deep Agents")).toBe("deepagents");
  });

  it("falls back to lowercase kebab-case for unknown agents", () => {
    expect(agentDisplayNameToId("My Custom Agent")).toBe("my-custom-agent");
  });
});
