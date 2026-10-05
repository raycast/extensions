import { describe, expect, it } from "vitest";
import type { Workspace } from "../lib/schema";
import { DEFAULT_SETTINGS } from "../lib/schema";
import { assessWorkspaceHealth, collectCandidatePorts, formatHealthIssues } from "../lib/workspace-health";

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
  openDevServerOnLaunch: true,
  devServerUrl: "http://localhost:5173",
  launches: [
    {
      id: "1a",
      label: "Web",
      terminal: "wt",
      wtProfile: null,
      command: "npm run dev -- --port 5173",
      runAsAdmin: false,
      isEnabled: true,
      order: 0,
      taskType: "none",
    },
  ],
};

describe("workspace-health", () => {
  it("reports validation failures honestly", () => {
    const report = assessWorkspaceHealth({ ...workspace, name: "" }, DEFAULT_SETTINGS);
    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => issue.code === "validation")).toBe(true);
  });

  it("joins multiple issues for display", () => {
    const message = formatHealthIssues([
      { code: "a", message: "First problem." },
      { code: "b", message: "Second problem." },
    ]);
    expect(message).toBe("First problem. Second problem.");
  });

  it("flags unsupported platforms for launch", () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { configurable: true, value: "linux" });
    const report = assessWorkspaceHealth(workspace, DEFAULT_SETTINGS);
    Object.defineProperty(process, "platform", { configurable: true, value: originalPlatform });
    expect(report.issues.some((issue) => issue.code === "platform")).toBe(true);
  });

  it("does not flag macOS as an unsupported platform", () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { configurable: true, value: "darwin" });
    const report = assessWorkspaceHealth(
      { ...workspace, directory: "/Users/dev/Projects/web" },
      { ...DEFAULT_SETTINGS, terminalApplication: "terminal" },
    );
    Object.defineProperty(process, "platform", { configurable: true, value: originalPlatform });
    expect(report.issues.some((issue) => issue.code === "platform")).toBe(false);
  });

  it("collects localhost and command ports", () => {
    expect(collectCandidatePorts(workspace).sort((a, b) => a - b)).toEqual([5173]);
  });

  it("does not treat image tags like redis:6379 as command ports", () => {
    const tagged: Workspace = {
      ...workspace,
      openDevServerOnLaunch: false,
      devServerUrl: null,
      launches: [
        {
          ...workspace.launches[0],
          command: "docker run redis:6379",
        },
      ],
    };
    expect(collectCandidatePorts(tagged)).toEqual([]);
  });

  it("warns when a candidate port is in use", () => {
    const report = assessWorkspaceHealth(workspace, DEFAULT_SETTINGS, {
      isPortInUse: (port) => port === 5173,
      includeDirectoryExists: false,
      includeLaunchPlan: false,
    });
    expect(report.issues.some((issue) => issue.code === "port_in_use" && issue.severity === "warning")).toBe(true);
    expect(
      report.issues.filter((issue) => issue.code === "port_in_use").every((issue) => issue.severity === "warning"),
    ).toBe(true);
  });

  it("omits port warning when the probe reports free", () => {
    const report = assessWorkspaceHealth(workspace, DEFAULT_SETTINGS, {
      isPortInUse: () => false,
      includeDirectoryExists: false,
      includeLaunchPlan: false,
    });
    expect(report.issues.some((issue) => issue.code === "port_in_use")).toBe(false);
  });
});
