import { describe, expect, it, vi } from "vitest";
import { buildFullResumeShellCommand, getResumeCommand } from "./terminal";
import type { SessionMeta } from "./types";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(),
}));

const prefs: Preferences = {
  defaultTerminal: "Terminal",
  claudeBinary: "claude",
  codexBinary: "codex",
};

const meta: SessionMeta = {
  id: "abc-123",
  title: "Test Session",
  source: "claude-cli",
  projectPath: "/Users/alice/O'Brien Books",
  timestamp: 0,
  filePath: "/tmp/session.jsonl",
};

describe("terminal resume commands", () => {
  it("keeps copyable resume commands POSIX single-quoted", () => {
    expect(getResumeCommand(meta, prefs)).toBe("cd '/Users/alice/O'\\''Brien Books' && claude --resume abc-123");
  });

  it("uses double-quoted cwd for AppleScript terminal commands", () => {
    expect(buildFullResumeShellCommand(meta, prefs)).toBe(
      'cd "/Users/alice/O\'Brien Books" && claude --resume abc-123',
    );
  });
});
