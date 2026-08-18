import { homedir } from "node:os";
import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({ Icon: { Person: "person" } }));

const { agentName, agentTitle, normalizeAgentKind } = await import("../src/lib/agent-appearance");

describe("agentName", () => {
  it("prefers the explicit agent name", () => {
    expect(agentName({ name: "billing-fix", agent: "claude", cwd: "/home/user" })).toBe("billing-fix");
  });

  // Regression: unnamed agents rendered the display_agent Nerd Font glyph
  // ("󰚩") as their title because the fallback chain used it as text.
  it("labels unnamed agents by their working directory", () => {
    const name = agentName({ agent: "claude", cwd: "/home/user/src/project" });
    expect(name).toBe("project");
  });

  it("uses the foreground cwd over the pane cwd", () => {
    const name = agentName({
      agent: "claude",
      cwd: "/home/user/src/repo",
      foreground_cwd: "/home/user/src/repo/.worktrees/feature",
    });
    expect(name).toBe("feature");
  });

  it("falls back to the humanized agent kind in the home directory", () => {
    expect(agentName({ agent: "claude", cwd: homedir() })).toBe("Claude Code");
  });

  it("falls back to a generic label without any identifying fields", () => {
    expect(agentName({})).toBe("Agent");
  });
});

describe("agentTitle", () => {
  it("humanizes known agent kinds", () => {
    expect(agentTitle("claude")).toBe("Claude Code");
    expect(agentTitle("claude_code")).toBe("Claude Code");
  });
});

describe("normalizeAgentKind", () => {
  it("ignores glyph values", () => {
    expect(normalizeAgentKind("󰚩")).toBeUndefined();
  });
});
