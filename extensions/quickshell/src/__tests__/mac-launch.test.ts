import { describe, expect, it } from "vitest";
import {
  buildMacLaunchInvocation,
  buildMacShellCommand,
  buildMacTabbedLaunchInvocation,
  groupMacLaunchEntries,
  normalizeMacTerminalApplication,
  resolveMacTerminalHostId,
  shellQuoteForZsh,
} from "../lib/mac-launch";
import type { QuickShellSettings } from "../lib/schema";
import type { LaunchPlanEntry } from "../lib/windows-launch";

const settings: QuickShellSettings = {
  terminalApplication: "terminal",
  defaultProfile: "__default__",
  recentWorkspaceCount: 8,
  multiLaunchPresentation: "separateWindows",
  blockDirtyBranchSwitch: true,
};

function entry(partial: {
  directory: string;
  command: string | null;
  launch?: LaunchPlanEntry["launch"];
}): LaunchPlanEntry {
  const launch = partial.launch ?? {
    id: "1",
    label: "Launch",
    terminal: "terminal",
    wtProfile: null,
    command: partial.command,
    runAsAdmin: false,
    isEnabled: true,
    order: 0,
    taskType: "none" as const,
  };
  return {
    workspace: {
      id: "ws",
      name: "Workspace",
      directory: partial.directory,
      isPinned: false,
      pinOrder: null,
      lastUsedUtc: null,
      abbreviation: null,
      terminal: "terminal",
      wtProfile: null,
      command: partial.command,
      runAsAdmin: false,
      launches: [launch],
    },
    launch,
    directory: partial.directory,
    command: partial.command,
    runAsAdmin: false,
    target: {
      kind: "wt",
      hostExecutable: "wt.exe",
      displayName: "Terminal",
    },
  };
}

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

  it("groups compatible Mac launches into one tabbed window", () => {
    const entries = [
      entry({
        directory: "/Users/dev/a",
        command: "npm run web",
        launch: {
          id: "a",
          label: "Web",
          terminal: "terminal",
          wtProfile: null,
          command: "npm run web",
          runAsAdmin: false,
          isEnabled: true,
          order: 0,
          taskType: "none",
        },
      }),
      entry({
        directory: "/Users/dev/a",
        command: "npm run api",
        launch: {
          id: "b",
          label: "API",
          terminal: "terminal",
          wtProfile: null,
          command: "npm run api",
          runAsAdmin: false,
          isEnabled: true,
          order: 1,
          taskType: "none",
        },
      }),
      entry({
        directory: "/Users/dev/b",
        command: "npm test",
        launch: {
          id: "c",
          label: "Test",
          terminal: "iterm",
          wtProfile: null,
          command: "npm test",
          runAsAdmin: false,
          isEnabled: true,
          order: 2,
          taskType: "none",
        },
      }),
    ];

    const groups = groupMacLaunchEntries(entries, settings, false);
    expect(groups).toHaveLength(2);
    expect(groups[0].hostId).toBe("terminal");
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[1].hostId).toBe("iterm");
    expect(groups[1].entries).toHaveLength(1);

    const tabbed = buildMacTabbedLaunchInvocation(groups[0].entries, "terminal");
    expect(tabbed.executable).toBe("osascript");
    expect(tabbed.args[1]).toContain("do script");
    expect(tabbed.args[1]).toContain("in front window");
    expect(tabbed.args[1]).toContain("npm run web");
    expect(tabbed.args[1]).toContain("npm run api");
  });

  it("keeps separate windows when preferred", () => {
    const entries = [
      entry({ directory: "/Users/dev/a", command: "one" }),
      entry({ directory: "/Users/dev/a", command: "two" }),
    ];
    const groups = groupMacLaunchEntries(entries, settings, true);
    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.entries.length === 1)).toBe(true);
  });
});
