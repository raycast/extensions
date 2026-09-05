import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildLaunchArguments,
  buildSelectedLaunchWorkspace,
  buildWindowsTerminalTabArguments,
  buildWorkspaceLaunchPlan,
  escapeWindowsArgument,
  parseWslUncPath,
  resolveLaunchTarget,
  resolveTerminalForLaunch,
} from "../lib/windows-launch";
import type { Workspace } from "../lib/schema";
import { DEFAULT_SETTINGS } from "../lib/schema";

const originalPlatform = process.platform;

beforeEach(() => {
  Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
});

afterEach(() => {
  Object.defineProperty(process, "platform", { configurable: true, value: originalPlatform });
});

const workspace: Workspace = {
  id: "1",
  name: "Frontend",
  abbreviation: "fe",
  directory: "C:\\Projects\\web",
  isPinned: false,
  pinOrder: null,
  lastUsedUtc: null,
  terminal: "wt",
  wtProfile: null,
  command: "npm run dev",
  runAsAdmin: false,
  launches: [
    {
      id: "1a",
      label: "Web",
      terminal: "wt",
      wtProfile: "PowerShell",
      command: "npm run dev",
      runAsAdmin: false,
      isEnabled: true,
      order: 0,
      taskType: "none",
    },
  ],
};

describe("windows-launch", () => {
  it("escapes arguments with spaces", () => {
    expect(escapeWindowsArgument("C:\\Projects\\My App")).toBe('"C:\\Projects\\My App"');
  });

  it("leaves values without spaces, tabs, or quotes unescaped", () => {
    expect(escapeWindowsArgument("C:\\Projects\\App")).toBe("C:\\Projects\\App");
  });

  it("doubles backslashes immediately preceding an embedded quote", () => {
    // "foo\"bar" -> backslash before the embedded quote must be tripled
    // (2n+1 rule) so the consumer doesn't see it as an escaped quote terminator.
    const expected = '"' + "foo" + "\\".repeat(3) + '"' + "bar" + '"';
    expect(escapeWindowsArgument('foo\\"bar')).toBe(expected);
  });

  it("doubles a trailing backslash that lands right before the closing quote", () => {
    // A lone trailing backslash must become two backslashes once the closing
    // quote is appended, otherwise it would escape that quote instead.
    const expected = '"' + "C:\\Some Path" + "\\".repeat(2) + '"';
    expect(escapeWindowsArgument("C:\\Some Path\\")).toBe(expected);
  });

  it("handles a backslash directly followed by a quote mid-string", () => {
    const expected = '"' + "a" + "\\".repeat(3) + '"' + "b" + '"';
    expect(escapeWindowsArgument('a\\"b')).toBe(expected);
  });

  it("resolves windows terminal targets", () => {
    const target = resolveLaunchTarget("wt", "PowerShell");
    expect(target.kind).toBe("wt");
    expect(target.hostExecutable).toBe("wt.exe");
    expect(target.profileOrDistro).toBe("PowerShell");
  });

  it("builds wt launch arguments with profile and directory", () => {
    const plan = buildWorkspaceLaunchPlan(workspace, DEFAULT_SETTINGS);
    const args = buildLaunchArguments(plan.entries[0]);
    expect(args).toContain("-p");
    expect(args).toContain("PowerShell");
    expect(args).toContain("-d");
    expect(args).toContain("C:\\Projects\\web");
    expect(args.join(" ")).toContain("npm run dev");
  });

  it("resolves intelligent terminal targets", () => {
    const target = resolveLaunchTarget("it", "PowerShell");
    expect(target.hostExecutable).toBe("wtai.exe");
    expect(target.displayName).toContain("Intelligent Terminal");
  });

  it("passes package manager commands directly to wt when directory is set separately", () => {
    const plan = buildWorkspaceLaunchPlan(workspace, DEFAULT_SETTINGS);
    const args = buildLaunchArguments(plan.entries[0]);
    expect(args.join(" ")).toContain("npm run dev");
    expect(args.join(" ")).not.toContain("cd /d");
  });

  it("groups multiple launches for windows terminal", () => {
    const multi: Workspace = {
      ...workspace,
      launches: [
        workspace.launches[0],
        {
          ...workspace.launches[0],
          id: "1b",
          label: "API",
          command: "dotnet run",
          order: 1,
        },
      ],
    };

    const plan = buildWorkspaceLaunchPlan(multi, DEFAULT_SETTINGS);
    expect(plan.entries).toHaveLength(2);
    expect(plan.groupedArguments.join(" ")).toContain("new-tab");
    expect(plan.groupedArguments.join(" ")).not.toContain("-w");
  });

  it("builds a selected launch workspace from the repository entry only", () => {
    const selected = buildSelectedLaunchWorkspace(
      {
        ...workspace,
        command: "bad\r\nworkspace command",
        launches: [
          { ...workspace.launches[0], id: "selected", command: "npm test", isEnabled: true },
          { ...workspace.launches[0], id: "invalid", label: "", command: "bad\r\nsibling", isEnabled: false },
        ],
      },
      "selected",
    );

    expect(selected?.command).toBe("npm test");
    expect(selected?.launches).toEqual([
      expect.objectContaining({ id: "selected", command: "npm test", isEnabled: true }),
    ]);
    expect(buildWorkspaceLaunchPlan(selected!, DEFAULT_SETTINGS).entries).toHaveLength(1);
  });

  it("does not build a selected workspace for a disabled authoritative launch", () => {
    const selected = buildSelectedLaunchWorkspace(
      {
        ...workspace,
        launches: [{ ...workspace.launches[0], id: "disabled", isEnabled: false }],
      },
      "disabled",
      DEFAULT_SETTINGS,
    );

    expect(selected).toBeNull();
  });

  it("resolves same-as-previous from the preceding ordered repository launch", () => {
    const selected = buildSelectedLaunchWorkspace(
      {
        ...workspace,
        launches: [
          {
            ...workspace.launches[0],
            id: "first",
            terminal: "wt",
            wtProfile: "PowerShell",
            order: 0,
          },
          {
            ...workspace.launches[0],
            id: "selected",
            terminal: "same-as-previous",
            wtProfile: null,
            command: "npm test",
            order: 1,
          },
        ],
      },
      "selected",
      DEFAULT_SETTINGS,
    );

    expect(selected?.launches[0]).toMatchObject({
      id: "selected",
      terminal: "wt",
      wtProfile: "PowerShell",
    });
    expect(buildWorkspaceLaunchPlan(selected!, DEFAULT_SETTINGS).entries[0].target).toMatchObject({
      kind: "wt",
      profileOrDistro: "PowerShell",
    });
  });

  it("resolves first same-as-previous launch to settings default", () => {
    expect(
      resolveTerminalForLaunch(
        {
          id: "only",
          label: "Only",
          terminal: "same-as-previous",
          wtProfile: null,
          command: "npm start",
          runAsAdmin: false,
          isEnabled: true,
          order: 0,
          taskType: "none",
        },
        { ...DEFAULT_SETTINGS, terminalApplication: "wt", defaultProfile: "__default__" },
      ),
    ).toEqual({ terminal: "wt", wtProfile: null });
  });

  it("parses supported WSL UNC paths strictly", () => {
    expect(parseWslUncPath("\\\\wsl$\\Ubuntu-24.04\\home\\dev\\My Project")).toEqual({
      distro: "Ubuntu-24.04",
      linuxPath: "/home/dev/My Project",
    });
    expect(parseWslUncPath("\\\\server\\share\\path")).toBeNull();
    expect(parseWslUncPath("\\\\wsl$\\..\\home\\dev")).toBeNull();
  });

  it("converts WSL UNC paths and infers the distro for direct launches", () => {
    const wslWorkspace: Workspace = {
      ...workspace,
      directory: "\\\\wsl$\\Ubuntu\\home\\dev\\project",
      launches: [{ ...workspace.launches[0], terminal: "wsl", wtProfile: null }],
    };
    const plan = buildWorkspaceLaunchPlan(wslWorkspace, DEFAULT_SETTINGS);
    const args = buildLaunchArguments(plan.entries[0]);

    expect(args.slice(0, 2)).toEqual(["-d", "Ubuntu"]);
    expect(args.join(" ")).toContain("cd '/home/dev/project'");
    expect(args.join(" ")).not.toContain("\\\\wsl$");
  });

  it("converts WSL UNC paths and infers the distro for grouped Windows Terminal launches", () => {
    const wslWorkspace: Workspace = {
      ...workspace,
      directory: "\\\\wsl$\\Debian\\srv\\api",
      launches: [{ ...workspace.launches[0], terminal: "wsl", wtProfile: null }],
    };
    const plan = buildWorkspaceLaunchPlan(wslWorkspace, DEFAULT_SETTINGS);
    const args = buildWindowsTerminalTabArguments(plan.entries[0]);

    expect(args.slice(0, 5)).toEqual(["wsl.exe", "-d", "Debian", "-e", "bash"]);
    expect(args.join(" ")).toContain("cd '/srv/api'");
    expect(args.join(" ")).not.toContain("\\\\wsl$");
  });
});
