import { describe, expect, it } from "vitest";
import { hasAbbreviationMatch, searchTaskActions, searchWorkspaces } from "../lib/search";
import type { Workspace } from "../lib/schema";

const workspaces: Workspace[] = [
  {
    id: "1",
    name: "Trackdub Agents",
    abbreviation: "td-agents",
    directory: "C:\\Projects\\Trackdub",
    isPinned: true,
    pinOrder: 1,
    lastUsedUtc: null,
    terminal: "default",
    wtProfile: null,
    command: "claude",
    runAsAdmin: false,
    launches: [
      {
        id: "1a",
        label: "Claude Code",
        terminal: "default",
        wtProfile: null,
        command: "claude",
        runAsAdmin: false,
        isEnabled: true,
        order: 0,
        taskType: "none",
      },
      {
        id: "1b",
        label: "Codex",
        terminal: "default",
        wtProfile: null,
        command: "codex",
        runAsAdmin: false,
        isEnabled: true,
        order: 1,
        taskType: "none",
      },
    ],
  },
  {
    id: "2",
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
        id: "2a",
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
  },
];

describe("search", () => {
  it("finds workspaces by abbreviation with exact matches first", () => {
    const results = searchWorkspaces(workspaces, "td-agents");
    expect(results.map((workspace) => workspace.id)).toEqual(["1"]);
  });

  it("finds workspaces by directory", () => {
    const results = searchWorkspaces(workspaces, "Projects\\web");
    expect(results.map((workspace) => workspace.id)).toEqual(["2"]);
  });

  it("finds launch actions by label and command", () => {
    const results = searchTaskActions(workspaces, "codex");
    expect(results).toHaveLength(1);
    expect(results[0].launch?.label).toBe("Codex");
  });

  it("detects home keyword abbreviation matches", () => {
    expect(hasAbbreviationMatch(workspaces, "fe")).toBe(true);
    expect(hasAbbreviationMatch(workspaces, "codex")).toBe(false);
  });

  it("prioritizes abbreviation matches over partial launch command matches", () => {
    const abbreviationFirst = searchWorkspaces(workspaces, "fe");
    expect(abbreviationFirst.map((workspace) => workspace.id)).toEqual(["2"]);
    expect(hasAbbreviationMatch(workspaces, "fe")).toBe(true);
  });
});
