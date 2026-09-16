import { describe, expect, it } from "vitest";
import type { Workspace } from "../lib/schema";
import {
  additionalLaunchCount,
  applySuggestionPillToLaunchRows,
  buildWorkspaceFromFormState,
  filterWorkspacesForEdit,
  launchRowsFromSuggestions,
  terminalForAddedLaunch,
  workspaceFormStateFromWorkspace,
} from "../lib/workspace-form-state";

const multiLaunchWorkspace: Workspace = {
  id: "1",
  name: "Full stack",
  abbreviation: "fs",
  directory: "C:\\Projects\\fullstack",
  isPinned: false,
  pinOrder: null,
  lastUsedUtc: null,
  terminal: "wt",
  wtProfile: null,
  command: "dotnet run",
  runAsAdmin: false,
  launches: [
    {
      id: "1a",
      label: "API",
      terminal: "wt",
      wtProfile: null,
      command: "dotnet run",
      runAsAdmin: false,
      isEnabled: true,
      order: 0,
      taskType: "api",
    },
    {
      id: "1b",
      label: "Web",
      terminal: "wt",
      wtProfile: null,
      command: "npm run dev",
      runAsAdmin: false,
      isEnabled: true,
      order: 1,
      taskType: "frontend",
    },
  ],
};

const defaultExtras = {
  companions: [] as Array<{
    id: string;
    presetId: string;
    path: string;
    arguments: string;
    openOnLaunch: boolean;
  }>,
  devServerUrl: "",
  openDevServerOnLaunch: false,
  repoUrl: "",
};

function launchRow(
  overrides: Partial<{
    id: string;
    command: string;
    terminal: string;
    wtProfile: string | null;
    runAsAdmin: boolean;
    isEnabled: boolean;
    label: string;
    taskType: string;
  }> = {},
) {
  return {
    id: "1a",
    command: "dotnet run",
    terminal: "wt",
    wtProfile: null as string | null,
    runAsAdmin: false,
    isEnabled: true,
    label: "API",
    taskType: "none",
    ...overrides,
  };
}

describe("workspace-form-state", () => {
  it("preserves additional launches when editing the primary launch", () => {
    const next = buildWorkspaceFromFormState(multiLaunchWorkspace, {
      name: "Full stack",
      abbreviation: "fs",
      directory: "C:\\Projects\\fullstack",
      terminal: "wt",
      wtProfile: null,
      isPinned: false,
      runAsAdmin: false,
      launches: [
        launchRow({ id: "1a", command: "dotnet watch run", label: "API", taskType: "api" }),
        launchRow({
          id: "1b",
          command: "npm run dev",
          label: "Web",
          taskType: "frontend",
        }),
      ],
      ...defaultExtras,
    });

    expect(next.launches).toHaveLength(2);
    expect(next.launches[0].command).toBe("dotnet watch run");
    expect(next.launches[1].label).toBe("Web");
    expect(next.launches[1].command).toBe("npm run dev");
  });

  it("drops empty command rows when saving", () => {
    const next = buildWorkspaceFromFormState(multiLaunchWorkspace, {
      name: "Full stack",
      abbreviation: "fs",
      directory: "C:\\Projects\\fullstack",
      terminal: "wt",
      wtProfile: null,
      isPinned: false,
      runAsAdmin: false,
      launches: [
        launchRow({ id: "1a", command: "dotnet run", label: "API", taskType: "api" }),
        launchRow({ id: "1b", command: "", label: "Web", taskType: "frontend" }),
      ],
      ...defaultExtras,
    });

    expect(next.launches).toHaveLength(1);
    expect(next.launches[0].command).toBe("dotnet run");
  });

  it("uses shared terminal profile when only one savable launch remains", () => {
    const next = buildWorkspaceFromFormState(multiLaunchWorkspace, {
      name: "Full stack",
      abbreviation: "fs",
      directory: "C:\\Projects\\fullstack",
      terminal: "cmd",
      wtProfile: null,
      isPinned: false,
      runAsAdmin: false,
      launches: [
        launchRow({
          id: "1a",
          command: "dotnet run",
          terminal: "wt",
          wtProfile: "PowerShell",
          label: "API",
          taskType: "api",
        }),
        launchRow({
          id: "1b",
          command: "",
          terminal: "wt",
          wtProfile: "Ubuntu",
          label: "Web",
          taskType: "frontend",
        }),
      ],
      ...defaultExtras,
    });

    expect(next.launches).toHaveLength(1);
    expect(next.launches[0].terminal).toBe("cmd");
    expect(next.launches[0].wtProfile).toBeNull();
    expect(next.wtProfile).toBeNull();
  });

  it("applies shared terminal profile when a single visible command row changes terminal", () => {
    const singleLaunchWorkspace: Workspace = {
      ...multiLaunchWorkspace,
      launches: [
        {
          ...multiLaunchWorkspace.launches[0],
          wtProfile: "PowerShell",
        },
      ],
    };

    const next = buildWorkspaceFromFormState(singleLaunchWorkspace, {
      name: "API",
      abbreviation: "api",
      directory: "C:\\Projects\\fullstack",
      terminal: "cmd",
      wtProfile: null,
      isPinned: false,
      runAsAdmin: false,
      launches: [
        launchRow({
          id: "1a",
          command: "dotnet run",
          terminal: "wt",
          wtProfile: "PowerShell",
          label: "API",
          taskType: "api",
        }),
      ],
      ...defaultExtras,
    });

    expect(next.launches[0].terminal).toBe("cmd");
    expect(next.launches[0].wtProfile).toBeNull();
    expect(next.terminal).toBe("cmd");
    expect(next.wtProfile).toBeNull();
  });

  it("derives form state from all launches", () => {
    const state = workspaceFormStateFromWorkspace(multiLaunchWorkspace);
    expect(state.launches).toHaveLength(2);
    expect(state.launches[0].command).toBe("dotnet run");
    expect(state.launches[1].label).toBe("Web");
  });

  it("round-trips taskType through form state load and save", () => {
    const state = workspaceFormStateFromWorkspace(multiLaunchWorkspace);
    expect(state.launches[0].taskType).toBe("api");
    expect(state.launches[1].taskType).toBe("frontend");

    const next = buildWorkspaceFromFormState(multiLaunchWorkspace, {
      ...state,
      ...defaultExtras,
      companions: state.companions,
      launches: state.launches,
    });

    expect(next.launches[0].taskType).toBe("api");
    expect(next.launches[1].taskType).toBe("frontend");
  });

  it("builds launch rows from project suggestions including taskType", () => {
    const rows = launchRowsFromSuggestions(
      [
        { label: "Dev", command: "npm run dev", taskType: "frontend" },
        { label: "Tests", command: "npm run test", taskType: "test" },
      ],
      "wt",
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].command).toBe("npm run dev");
    expect(rows[0].terminal).toBe("wt");
    expect(rows[0].taskType).toBe("frontend");
    expect(rows[1].label).toBe("Tests");
    expect(rows[1].terminal).toBe("same-as-previous");
    expect(rows[1].taskType).toBe("test");
  });

  it("applies suggestion pills into the first empty row and preserves taskType", () => {
    const filled = applySuggestionPillToLaunchRows(
      [
        launchRow({ id: "empty", command: "", label: "Launch", taskType: "none" }),
        launchRow({ id: "kept", command: "npm test", label: "Tests", taskType: "test" }),
      ],
      {
        command: "claude",
        taskType: "agent",
        displayTitle: "Claude",
      },
    );

    expect(filled[0].command).toBe("claude");
    expect(filled[0].label).toBe("Claude");
    expect(filled[0].taskType).toBe("agent");
    expect(filled[1].command).toBe("npm test");
  });

  it("appends a suggestion pill when every command row is filled", () => {
    const appended = applySuggestionPillToLaunchRows(
      [launchRow({ id: "1a", command: "npm run dev", label: "Dev", taskType: "frontend" })],
      { command: "dotnet watch", taskType: "api", typeTitle: "API" },
    );

    expect(appended).toHaveLength(2);
    expect(appended[1].command).toBe("dotnet watch");
    expect(appended[1].taskType).toBe("api");
    expect(appended[1].label).toBe("API");
    expect(appended[1].terminal).toBe("same-as-previous");
  });

  it("defaults added launch terminal like CmdPal (default then same-as-previous)", () => {
    expect(terminalForAddedLaunch([], "default")).toEqual({ terminal: "default", wtProfile: null });
    expect(terminalForAddedLaunch([{ command: "" }], "default")).toEqual({
      terminal: "default",
      wtProfile: null,
    });
    expect(terminalForAddedLaunch([{ command: "npm start" }], "default")).toEqual({
      terminal: "same-as-previous",
      wtProfile: null,
    });
  });

  it("filters workspaces for edit by name and launch text", () => {
    const results = filterWorkspacesForEdit(
      [
        multiLaunchWorkspace,
        {
          ...multiLaunchWorkspace,
          id: "2",
          name: "Docs",
          abbreviation: "docs",
          directory: "C:\\Projects\\docs",
          launches: [],
        },
      ],
      "npm",
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("counts additional enabled launches", () => {
    expect(additionalLaunchCount(multiLaunchWorkspace)).toBe(1);
  });

  it("uses shared terminal and admin controls for single-launch workspaces", () => {
    const next = buildWorkspaceFromFormState(multiLaunchWorkspace, {
      name: "Single",
      abbreviation: "one",
      directory: "C:\\Projects\\one",
      terminal: "pwsh",
      wtProfile: null,
      isPinned: false,
      runAsAdmin: true,
      launches: [
        launchRow({
          id: "1a",
          command: "npm run dev",
          terminal: "default",
          label: "Dev",
          taskType: "frontend",
        }),
      ],
      ...defaultExtras,
    });

    expect(next.launches).toHaveLength(1);
    expect(next.launches[0].terminal).toBe("pwsh");
    expect(next.launches[0].runAsAdmin).toBe(true);
  });
});
