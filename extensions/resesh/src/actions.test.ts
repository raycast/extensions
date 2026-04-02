import { bashCommand } from "./actions";

// ---------------------------------------------------------------------------
// bashCommand (pure — no platform dependency)
// ---------------------------------------------------------------------------

describe("bashCommand", () => {
  it("builds cd && resume command", () => {
    const cmd = bashCommand("/home/user/project", "claude --resume abc");
    expect(cmd).toBe(`export PATH="$HOME/.local/bin:$PATH" && cd '/home/user/project' && claude --resume abc`);
  });

  it("escapes single quotes in directory path", () => {
    const cmd = bashCommand("/home/user/it's a dir", "claude --resume abc");
    expect(cmd).toContain("it'\\''s a dir");
  });
});

// ---------------------------------------------------------------------------
// escapeShellArg — platform-dependent (tests current platform)
// ---------------------------------------------------------------------------

const isMac = process.platform === "darwin";

describe("escapeShellArg", () => {
  // Import dynamically so we always get the fresh module with correct platform detection
  it("wraps argument in quotes", async () => {
    const { escapeShellArg } = await import("./actions");
    const result = escapeShellArg("hello world");

    if (isMac) {
      expect(result).toBe("'hello world'");
    } else {
      expect(result).toBe('"hello world"');
    }
  });

  it("escapes internal quotes", async () => {
    const { escapeShellArg } = await import("./actions");

    if (isMac) {
      const result = escapeShellArg("it's");
      expect(result).toBe("'it'\\''s'");
    } else {
      const result = escapeShellArg('say "hello"');
      expect(result).toBe('"say \\"hello\\""');
    }
  });
});

// ---------------------------------------------------------------------------
// resolveTerminal — platform-dependent (tests current platform)
// ---------------------------------------------------------------------------

describe("resolveTerminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves 'default' to platform-appropriate terminal", async () => {
    const { resolveTerminal } = await import("./actions");
    const result = resolveTerminal("default");
    if (isMac) {
      expect(result).toBe("terminal");
    } else {
      expect(result).toBe("wt");
    }
  });

  it("returns valid terminal as-is", async () => {
    const { resolveTerminal } = await import("./actions");
    if (isMac) {
      expect(resolveTerminal("ghostty")).toBe("ghostty");
    } else {
      expect(resolveTerminal("powershell")).toBe("powershell");
    }
  });

  it("falls back for invalid platform terminal", async () => {
    const { resolveTerminal } = await import("./actions");
    const { showToast } = await import("@raycast/api");

    if (isMac) {
      // Windows-only terminal on Mac should fall back
      const result = resolveTerminal("wt");
      expect(result).toBe("terminal");
      expect(showToast).toHaveBeenCalled();
    } else {
      // Mac-only terminal on Windows should fall back
      const result = resolveTerminal("iterm");
      expect(result).toBe("wt");
      expect(showToast).toHaveBeenCalled();
    }
  });
});
