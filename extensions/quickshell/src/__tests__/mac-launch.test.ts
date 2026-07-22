import { describe, expect, it } from "vitest";
import {
  buildMacLaunchInvocation,
  buildMacShellCommand,
  normalizeMacTerminalApplication,
  resolveMacTerminalHostId,
  shellQuoteForZsh,
} from "../lib/mac-launch";
import type { QuickShellSettings } from "../lib/schema";

const settings: QuickShellSettings = {
  terminalApplication: "terminal",
  defaultProfile: "__default__",
  recentWorkspaceCount: 8,
  multiLaunchPresentation: "separateWindows",
  blockDirtyBranchSwitch: true,
};

describe("mac-launch", () => {
  it("quotes paths for zsh", () => {
    expect(shellQuoteForZsh("/Users/dev/My Project")).toBe("'/Users/dev/My Project'");
    expect(shellQuoteForZsh("/Users/dev/It's")).toBe("'/Users/dev/It'\\''s'");
  });

  it("builds cd-only and cd+command shells", () => {
    expect(buildMacShellCommand("/tmp/proj", null)).toBe("cd '/tmp/proj'");
    expect(buildMacShellCommand("/tmp/proj", "npm run dev")).toBe("cd '/tmp/proj' && npm run dev");
  });

  it("maps windows terminal ids to the Mac default host", () => {
    expect(resolveMacTerminalHostId("wt", settings)).toBe("terminal");
    expect(resolveMacTerminalHostId("cmd", settings)).toBe("terminal");
    expect(resolveMacTerminalHostId("iterm", settings)).toBe("iterm");
    expect(normalizeMacTerminalApplication("wt")).toBe("terminal");
    expect(normalizeMacTerminalApplication("iterm")).toBe("iterm");
  });

  it("opens directory-only launches with open -a", () => {
    const invocation = buildMacLaunchInvocation("/Users/dev/app", null, "terminal");
    expect(invocation.executable).toBe("open");
    expect(invocation.args).toEqual(["-a", "Terminal", "/Users/dev/app"]);
  });

  it("runs commands via Terminal osascript", () => {
    const invocation = buildMacLaunchInvocation("/Users/dev/app", "npm test", "terminal");
    expect(invocation.executable).toBe("osascript");
    expect(invocation.args[0]).toBe("-e");
    expect(invocation.args[1]).toContain('tell application "Terminal"');
    expect(invocation.args[1]).toContain("npm test");
  });
});
