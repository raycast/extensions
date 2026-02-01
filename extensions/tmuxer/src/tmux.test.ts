import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildListCommand,
  parseSessionOutput,
  buildAttachCommand,
  buildTerminalLaunchCommand,
  buildRenameCommand,
  buildKillCommand,
} from "./tmux";

describe("buildListCommand", () => {
  it("builds local list command with PATH prefix", () => {
    const cmd = buildListCommand("local", "");
    expect(cmd).toContain("PATH=/opt/homebrew/bin:/usr/local/bin:$PATH");
    expect(cmd).toContain("tmux list-sessions");
    expect(cmd).toContain("-F");
  });

  it("builds ssh list command wrapping local command", () => {
    const cmd = buildListCommand("ssh", "agentbox");
    expect(cmd.startsWith("ssh agentbox")).toBe(true);
    expect(cmd).toContain("tmux list-sessions");
  });

  it("handles different ssh hosts", () => {
    const cmd = buildListCommand("ssh", "myserver.example.com");
    expect(cmd.startsWith("ssh myserver.example.com")).toBe(true);
  });

  it("includes socket path when provided", () => {
    const cmd = buildListCommand("local", "", "/tmp/custom.sock");
    expect(cmd).toContain("tmux -S '/tmp/custom.sock'");
  });

  it("includes ssh args when provided", () => {
    const cmd = buildListCommand("ssh", "agentbox", undefined, "-i ~/.ssh/key");
    expect(cmd.startsWith("ssh -i ~/.ssh/key agentbox")).toBe(true);
  });
});

describe("parseSessionOutput", () => {
  it("parses empty output", () => {
    expect(parseSessionOutput("")).toEqual([]);
    expect(parseSessionOutput("   ")).toEqual([]);
  });

  it("parses single session", () => {
    const output = "my-session|3|0|Thu Jan 29 18:00:00 2026";
    const sessions = parseSessionOutput(output);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toEqual({
      name: "my-session",
      windows: 3,
      attached: false,
      created: "Thu Jan 29 18:00:00 2026",
    });
  });

  it("parses multiple sessions", () => {
    const output = `session1|1|0|Thu Jan 29 18:00:00 2026
session2|2|1|Thu Jan 29 17:00:00 2026
session3|5|0|`;
    const sessions = parseSessionOutput(output);
    expect(sessions).toHaveLength(3);
    expect(sessions[0].name).toBe("session1");
    expect(sessions[1].name).toBe("session2");
    expect(sessions[1].attached).toBe(true);
    expect(sessions[2].windows).toBe(5);
    expect(sessions[2].created).toBe("");
  });

  it("handles attached sessions correctly", () => {
    const output = "attached-session|1|1|";
    const sessions = parseSessionOutput(output);
    expect(sessions[0].attached).toBe(true);
  });

  it("handles detached sessions correctly", () => {
    const output = "detached-session|1|0|";
    const sessions = parseSessionOutput(output);
    expect(sessions[0].attached).toBe(false);
  });

  it("filters out malformed lines", () => {
    const output = `valid|1|0|date
malformed line without pipes
another-valid|2|1|date2`;
    const sessions = parseSessionOutput(output);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].name).toBe("valid");
    expect(sessions[1].name).toBe("another-valid");
  });

  it("filters out empty session names", () => {
    const output = "|1|0|date";
    const sessions = parseSessionOutput(output);
    expect(sessions).toHaveLength(0);
  });

  it("defaults to 1 window if parsing fails", () => {
    const output = "session|invalid|0|";
    const sessions = parseSessionOutput(output);
    expect(sessions[0].windows).toBe(1);
  });
});

describe("buildAttachCommand", () => {
  it("builds local attach command", () => {
    const cmd = buildAttachCommand("my-session", "local", "");
    expect(cmd).toContain("tmux new -A -s 'my-session'");
    expect(cmd).toContain("PATH=/opt/homebrew/bin");
  });

  it("builds ssh attach command with -t flag", () => {
    const cmd = buildAttachCommand("my-session", "ssh", "agentbox");
    expect(cmd.startsWith("ssh agentbox -t")).toBe(true);
    expect(cmd).toContain("tmux new -A -s 'my-session'");
  });

  it("escapes single quotes in session names", () => {
    const cmd = buildAttachCommand("session's-name", "local", "");
    expect(cmd).toContain("session'\\''s-name");
  });

  it("handles session names with spaces", () => {
    const cmd = buildAttachCommand("my session", "local", "");
    expect(cmd).toContain("'my session'");
  });

  it("includes socket path when provided", () => {
    const cmd = buildAttachCommand(
      "my-session",
      "local",
      "",
      "/tmp/custom.sock",
    );
    expect(cmd).toContain("tmux -S '/tmp/custom.sock' new -A -s 'my-session'");
  });

  it("includes ssh args when provided", () => {
    const cmd = buildAttachCommand(
      "my-session",
      "ssh",
      "agentbox",
      undefined,
      "-i ~/.ssh/key",
    );
    expect(cmd.startsWith("ssh -i ~/.ssh/key agentbox -t")).toBe(true);
  });
});

describe("buildTerminalLaunchCommand", () => {
  describe("ghostty", () => {
    const originalGhosttyBin = process.env.GHOSTTY_BIN;

    beforeEach(() => {
      process.env.GHOSTTY_BIN = "ghostty";
    });

    afterEach(() => {
      if (originalGhosttyBin === undefined) {
        delete process.env.GHOSTTY_BIN;
      } else {
        process.env.GHOSTTY_BIN = originalGhosttyBin;
      }
    });

    it("builds ghostty command with bash -c", () => {
      const cmd = buildTerminalLaunchCommand("echo hello", "ghostty");
      expect(cmd).toBe("ghostty -e /bin/bash -lc 'echo hello'");
    });

    it("escapes single quotes for ghostty", () => {
      const cmd = buildTerminalLaunchCommand("echo 'hello world'", "ghostty");
      expect(cmd).toBe("ghostty -e /bin/bash -lc 'echo '\\''hello world'\\'''");
    });

    it("handles tmux command for ghostty", () => {
      const cmd = buildTerminalLaunchCommand(
        "tmux new -A -s 'test'",
        "ghostty",
      );
      expect(cmd).toContain("ghostty -e");
      expect(cmd).toContain("/bin/bash -lc");
      expect(cmd).toContain("tmux new -A -s");
    });
  });

  describe("iterm", () => {
    it("builds iterm command with osascript", () => {
      const cmd = buildTerminalLaunchCommand("echo hello", "iterm");
      expect(cmd).toContain("osascript -e");
      expect(cmd).toContain('tell application "iTerm"');
      expect(cmd).toContain("create window with default profile command");
    });

    it("escapes double quotes for iterm", () => {
      const cmd = buildTerminalLaunchCommand('echo "hello"', "iterm");
      expect(cmd).toContain('\\"hello\\"');
    });
  });
});

describe("buildRenameCommand", () => {
  it("builds local rename command", () => {
    const cmd = buildRenameCommand("old-name", "new-name", "local", "");
    expect(cmd).toContain("tmux rename-session -t 'old-name' 'new-name'");
    expect(cmd).toContain("PATH=/opt/homebrew/bin");
  });

  it("builds ssh rename command", () => {
    const cmd = buildRenameCommand("old-name", "new-name", "ssh", "agentbox");
    expect(cmd.startsWith("ssh agentbox")).toBe(true);
    expect(cmd).toContain("tmux rename-session -t 'old-name' 'new-name'");
  });

  it("escapes single quotes in session names", () => {
    const cmd = buildRenameCommand("old's-name", "new's-name", "local", "");
    expect(cmd).toContain("old'\\''s-name");
    expect(cmd).toContain("new'\\''s-name");
  });

  it("includes socket path when provided", () => {
    const cmd = buildRenameCommand(
      "old-name",
      "new-name",
      "local",
      "",
      "/tmp/custom.sock",
    );
    expect(cmd).toContain(
      "tmux -S '/tmp/custom.sock' rename-session -t 'old-name' 'new-name'",
    );
  });
});

describe("buildKillCommand", () => {
  it("builds local kill command", () => {
    const cmd = buildKillCommand("old-name", "local", "");
    expect(cmd).toContain("tmux kill-session -t 'old-name'");
    expect(cmd).toContain("PATH=/opt/homebrew/bin");
  });

  it("builds ssh kill command", () => {
    const cmd = buildKillCommand("old-name", "ssh", "agentbox");
    expect(cmd.startsWith("ssh agentbox")).toBe(true);
    expect(cmd).toContain("tmux kill-session -t 'old-name'");
  });

  it("escapes single quotes in session names", () => {
    const cmd = buildKillCommand("old's-name", "local", "");
    expect(cmd).toContain("old'\\''s-name");
  });

  it("includes socket path when provided", () => {
    const cmd = buildKillCommand("old-name", "local", "", "/tmp/custom.sock");
    expect(cmd).toContain(
      "tmux -S '/tmp/custom.sock' kill-session -t 'old-name'",
    );
  });
});
