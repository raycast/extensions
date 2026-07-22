import { describe, expect, it, vi } from "vitest";
import type { QuickShellSettings, Workspace } from "../lib/schema";
import { executeWorkspaceLaunch, type ExecFn } from "../lib/launch-executor";

const { runPostLaunchActionsMock } = vi.hoisted(() => ({
  runPostLaunchActionsMock: vi.fn(
    async (
      _plan?: unknown,
      options?: { phase?: string },
    ): Promise<{ companionOpened: boolean; devServerOpened: boolean; warnings: string[] }> => {
      void options;
      return {
        companionOpened: false,
        devServerOpened: false,
        warnings: [],
      };
    },
  ),
}));

vi.mock("../lib/post-launch-actions", () => ({
  runPostLaunchActions: runPostLaunchActionsMock,
}));

const settings: QuickShellSettings = {
  terminalApplication: "wt",
  defaultProfile: "__default__",
  recentWorkspaceCount: 8,
  multiLaunchPresentation: "singleWindowTabs",
  blockDirtyBranchSwitch: true,
};

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
      wtProfile: null,
      command: "npm run dev",
      runAsAdmin: false,
      isEnabled: true,
      order: 0,
      taskType: "none",
    },
  ],
};

describe("launch-executor", () => {
  it("runs companions before terminals and dev-server after", async () => {
    runPostLaunchActionsMock.mockClear();
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    const order: string[] = [];
    runPostLaunchActionsMock.mockImplementation(async (_plan, options) => {
      order.push(`post:${options?.phase ?? "all"}`);
      return { companionOpened: false, devServerOpened: false, warnings: [] };
    });
    const execFn: ExecFn = async () => {
      order.push("terminal");
    };

    try {
      const { buildWorkspaceLaunchPlan } = await import("../lib/windows-launch");
      const plan = buildWorkspaceLaunchPlan(workspace, settings);
      const authorizedEffects = {
        companions: [
          {
            companionId: "authorized",
            executablePath: process.execPath,
            arguments: null,
            workingDirectory: workspace.directory,
          },
        ],
        devServerUrl: "http://localhost:5173",
      };
      const result = await executeWorkspaceLaunch(plan, settings, execFn, { authorizedEffects });

      expect(result.ok).toBe(true);
      expect(order).toEqual(["post:companions", "terminal", "post:devServer"]);
      expect(runPostLaunchActionsMock).toHaveBeenCalledWith(authorizedEffects, {
        openUrl: undefined,
        phase: "companions",
      });
      expect(runPostLaunchActionsMock).toHaveBeenCalledWith(authorizedEffects, {
        openUrl: undefined,
        phase: "devServer",
      });
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    }
  });

  it("passes only the authorized effects plan to post-launch execution", async () => {
    runPostLaunchActionsMock.mockClear();
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    const execFn: ExecFn = async () => undefined;

    const workspaceWithHooks: Workspace = {
      ...workspace,
      openDevServerOnLaunch: true,
      devServerUrl: "http://localhost:5173",
      openCompanionAppOnLaunch: true,
      companionAppPath: "C:\\Program Files\\Code.exe",
    };
    const { buildWorkspaceLaunchPlan } = await import("../lib/windows-launch");
    const plan = buildWorkspaceLaunchPlan(workspaceWithHooks, settings);
    const authorizedEffects = {
      companions: [
        {
          companionId: "authorized",
          executablePath: process.execPath,
          arguments: null,
          workingDirectory: workspaceWithHooks.directory,
        },
      ],
      devServerUrl: "http://localhost:5173",
    };
    const result = await executeWorkspaceLaunch(plan, settings, execFn, {
      authorizedEffects,
    });

    Object.defineProperty(process, "platform", { value: originalPlatform });
    expect(result.ok).toBe(true);
    expect(runPostLaunchActionsMock).toHaveBeenCalledWith(authorizedEffects, {
      openUrl: undefined,
      phase: "companions",
    });
    expect(runPostLaunchActionsMock).toHaveBeenCalledWith(authorizedEffects, {
      openUrl: undefined,
      phase: "devServer",
    });
  });

  it("launches via open/osascript on macOS (separate windows)", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { configurable: true, value: "darwin" });
    const calls: Array<{ command: string; args: string[] }> = [];
    const execFn: ExecFn = async (command, args) => {
      calls.push({ command, args });
    };

    try {
      const macWorkspace: Workspace = {
        ...workspace,
        directory: "/Users/dev/Projects/web",
        terminal: "terminal",
        launches: [
          {
            id: "1a",
            label: "Web",
            terminal: "terminal",
            wtProfile: null,
            command: "npm run dev",
            runAsAdmin: false,
            isEnabled: true,
            order: 0,
            taskType: "none",
          },
          {
            id: "1b",
            label: "API",
            terminal: "terminal",
            wtProfile: null,
            command: "npm run api",
            runAsAdmin: false,
            isEnabled: true,
            order: 1,
            taskType: "none",
          },
        ],
      };
      const macSettings: QuickShellSettings = {
        ...settings,
        terminalApplication: "terminal",
        multiLaunchPresentation: "singleWindowTabs",
      };
      const { buildWorkspaceLaunchPlan } = await import("../lib/windows-launch");
      const plan = buildWorkspaceLaunchPlan(macWorkspace, macSettings);
      const result = await executeWorkspaceLaunch(plan, macSettings, execFn);

      expect(result.ok).toBe(true);
      expect(calls).toHaveLength(2);
      expect(calls.every((call) => call.command === "osascript")).toBe(true);
    } finally {
      Object.defineProperty(process, "platform", { configurable: true, value: originalPlatform });
    }
  });

  it("refuses launch on unsupported platforms", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { configurable: true, value: "linux" });
    const { buildWorkspaceLaunchPlan } = await import("../lib/windows-launch");
    const plan = buildWorkspaceLaunchPlan(workspace, settings);
    const execFn: ExecFn = async () => undefined;

    const result = await executeWorkspaceLaunch(plan, settings, execFn);

    Object.defineProperty(process, "platform", { configurable: true, value: originalPlatform });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Windows|macOS/);
    }
  });

  it("executes a single windows terminal launch on win32", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    const calls: Array<{ command: string; args: string[] }> = [];
    const execFn: ExecFn = async (command, args) => {
      calls.push({ command, args });
    };

    const { buildWorkspaceLaunchPlan } = await import("../lib/windows-launch");
    const plan = buildWorkspaceLaunchPlan(workspace, settings);
    const result = await executeWorkspaceLaunch(plan, settings, execFn);

    Object.defineProperty(process, "platform", { value: originalPlatform });
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe("wt.exe");
    expect(calls[0].args).toContain("-d");
    expect(calls[0].args).toContain("C:\\Projects\\web");
  });

  it("uses elevated powershell wrapper for admin launches", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    const calls: Array<{ command: string; args: string[] }> = [];
    const execFn: ExecFn = async (command, args) => {
      calls.push({ command, args });
    };

    const adminWorkspace: Workspace = {
      ...workspace,
      runAsAdmin: true,
      launches: [{ ...workspace.launches[0], runAsAdmin: true }],
    };
    const { buildWorkspaceLaunchPlan } = await import("../lib/windows-launch");
    const plan = buildWorkspaceLaunchPlan(adminWorkspace, settings);
    await executeWorkspaceLaunch(plan, settings, execFn);

    Object.defineProperty(process, "platform", { value: originalPlatform });
    expect(calls[0].command).toBe("powershell.exe");
    expect(calls[0].args.join(" ")).toContain("RunAs");
  });

  it("opens multiple wt commands as one process with tabs", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    const calls: Array<{ command: string; args: string[] }> = [];
    const execFn: ExecFn = async (command, args) => {
      calls.push({ command, args });
    };

    const multiWorkspace: Workspace = {
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
    const { buildWorkspaceLaunchPlan } = await import("../lib/windows-launch");
    const plan = buildWorkspaceLaunchPlan(multiWorkspace, settings);
    const result = await executeWorkspaceLaunch(plan, settings, execFn);

    Object.defineProperty(process, "platform", { value: originalPlatform });
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe("wt.exe");
    const joined = calls[0].args.join(" ");
    expect(joined).toContain("new-tab");
    expect(joined).not.toContain("-w");
  });

  it("routes cmd and wt shells through one wt process when tabs are enabled", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    const calls: Array<{ command: string; args: string[] }> = [];
    const execFn: ExecFn = async (command, args) => {
      calls.push({ command, args });
    };

    const mixedWorkspace: Workspace = {
      ...workspace,
      launches: [
        workspace.launches[0],
        {
          ...workspace.launches[0],
          id: "1b",
          label: "Legacy",
          terminal: "cmd",
          command: "dir",
          order: 1,
        },
      ],
    };
    const { buildWorkspaceLaunchPlan } = await import("../lib/windows-launch");
    const plan = buildWorkspaceLaunchPlan(mixedWorkspace, settings);
    await executeWorkspaceLaunch(plan, settings, execFn);

    Object.defineProperty(process, "platform", { value: originalPlatform });
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe("wt.exe");
    expect(calls[0].args.join(" ")).toContain("cmd.exe");
  });

  it("opens separate windows when multiLaunchPresentation is separateWindows", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    const calls: Array<{ command: string; args: string[] }> = [];
    const execFn: ExecFn = async (command, args) => {
      calls.push({ command, args });
    };

    const multiWorkspace: Workspace = {
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
    const separateSettings: QuickShellSettings = {
      ...settings,
      multiLaunchPresentation: "separateWindows",
    };
    const { buildWorkspaceLaunchPlan } = await import("../lib/windows-launch");
    const plan = buildWorkspaceLaunchPlan(multiWorkspace, separateSettings);
    await executeWorkspaceLaunch(plan, separateSettings, execFn);

    Object.defineProperty(process, "platform", { value: originalPlatform });
    expect(calls).toHaveLength(2);
    expect(calls.every((call) => call.command === "wt.exe")).toBe(true);
  });
});
