import { describe, expect, it } from "vitest";
import { formatLaunchDiagnostics } from "../lib/launch-diagnostics";
import { DEFAULT_SETTINGS, type Workspace } from "../lib/schema";
import { assessWorkspaceHealth } from "../lib/workspace-health";

describe("launch-diagnostics", () => {
  it("formats a copyable diagnostics summary", () => {
    const text = formatLaunchDiagnostics({
      title: "Launch blocked",
      workspaceName: "Demo",
      workspaceId: "ws-1",
      directory: "C:\\Projects\\demo",
      command: "npm run dev",
      elevation: "admin",
      denialCode: "WorkspaceUntrusted",
      issues: ["WorkspaceUntrusted: Trust this workspace first."],
    });

    expect(text).toContain("Quick Shell launch diagnostics");
    expect(text).toContain("Denial: WorkspaceUntrusted");
    expect(text).toContain("Elevation: admin");
  });
});

describe("workspace-health terminal checks", () => {
  it("warns about WSL UNC directories", () => {
    const workspace: Workspace = {
      id: "1",
      name: "WSL",
      directory: "\\\\wsl$\\Ubuntu\\home\\dev\\project",
      terminal: "wt",
      command: "echo hi",
      runAsAdmin: false,
      isPinned: false,
      launches: [
        {
          id: "1a",
          label: "Shell",
          terminal: "wt",
          command: "echo hi",
          runAsAdmin: false,
          isEnabled: true,
          order: 0,
        },
      ],
    };

    const report = assessWorkspaceHealth(workspace, DEFAULT_SETTINGS, {
      includeLaunchPlan: false,
      includeDirectoryExists: false,
    });
    expect(report.issues.some((issue) => issue.code === "wsl_directory")).toBe(true);
  });

  it("warns about wsl.localhost UNC directories", () => {
    const workspace: Workspace = {
      id: "1",
      name: "WSL",
      directory: "\\\\wsl.localhost\\Ubuntu\\home\\dev\\project",
      terminal: "wt",
      command: "echo hi",
      runAsAdmin: false,
      isPinned: false,
      launches: [
        {
          id: "1a",
          label: "Shell",
          terminal: "wt",
          command: "echo hi",
          runAsAdmin: false,
          isEnabled: true,
          order: 0,
        },
      ],
    };

    const report = assessWorkspaceHealth(workspace, DEFAULT_SETTINGS, {
      includeLaunchPlan: false,
      includeDirectoryExists: false,
    });
    expect(report.issues.some((issue) => issue.code === "wsl_directory")).toBe(true);
  });
});
