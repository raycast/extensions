import { describe, expect, it } from "vitest";
import { normalizeWorkspace, validateWorkspace, workspaceHasConfiguredCompanions } from "../lib/validation";
import type { Workspace } from "../lib/schema";

function sampleWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return normalizeWorkspace({
    id: "a1b2c3d4e5f6478990a1b2c3d4e5f678",
    name: "Demo",
    abbreviation: "demo",
    directory: "C:\\Projects\\Demo",
    isPinned: false,
    pinOrder: null,
    lastUsedUtc: null,
    terminal: "default",
    wtProfile: null,
    command: "npm run dev",
    runAsAdmin: false,
    launches: [
      {
        id: "b2c3d4e5f6478990a1b2c3d4e5f67890",
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
    ...overrides,
  });
}

describe("validation", () => {
  it("accepts a valid workspace", () => {
    expect(validateWorkspace(sampleWorkspace()).ok).toBe(true);
  });

  it("rejects missing directory", () => {
    const result = validateWorkspace(sampleWorkspace({ directory: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("directory");
    }
  });

  it("synthesizes a launch entry when launches are empty", () => {
    const workspace = normalizeWorkspace(
      sampleWorkspace({
        launches: [],
        command: "dotnet run",
      }),
    );
    expect(workspace.launches).toHaveLength(1);
    expect(workspace.launches[0].command).toBe("dotnet run");
  });

  it("detects configured companion apps for list actions", () => {
    expect(workspaceHasConfiguredCompanions(sampleWorkspace())).toBe(false);
    expect(
      workspaceHasConfiguredCompanions(
        sampleWorkspace({
          companionApps: [
            {
              id: "c1",
              path: "C:\\Editors\\Code.exe",
              arguments: null,
              openOnLaunch: false,
              order: 0,
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});
