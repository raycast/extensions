import { describe, expect, it } from "vitest";
import { importParsedPayload } from "../lib/import-export";
import { createEmptyStoredData } from "../lib/schema";
import { createStableId } from "../lib/ids";
import { normalizeWorkspace } from "../lib/validation";

describe("import-export", () => {
  it("imports CmdPal shortcut arrays with pascal case keys", () => {
    const result = importParsedPayload([
      {
        Name: "Frontend",
        Abbreviation: "fe",
        Directory: "C:\\Projects\\web",
        Command: "npm run dev",
        Terminal: "wt",
        DevServerUrl: "http://localhost:5173",
        OpenDevServerOnLaunch: true,
      },
    ]);

    expect(result.imported).toBe(1);
    expect(result.data.workspaces[0].name).toBe("Frontend");
    expect(result.data.workspaces[0].devServerUrl).toBe("http://localhost:5173");
    expect(result.data.workspaces[0].openDevServerOnLaunch).toBe(true);
  });

  it("merges without duplicating names", () => {
    const existing = createEmptyStoredData();
    existing.workspaces.push(
      normalizeWorkspace({
        id: createStableId(),
        name: "Frontend",
        abbreviation: "fe",
        directory: "C:\\Projects\\web",
        isPinned: false,
        pinOrder: null,
        lastUsedUtc: null,
        terminal: "wt",
        wtProfile: null,
        command: null,
        runAsAdmin: false,
        launches: [
          {
            id: createStableId(),
            label: "Launch",
            terminal: "wt",
            wtProfile: null,
            command: null,
            runAsAdmin: false,
            isEnabled: true,
            order: 0,
            taskType: "none",
          },
        ],
      }),
    );

    const result = importParsedPayload(
      [{ name: "Frontend", directory: "C:\\Projects\\web-2", command: "npm run dev", terminal: "wt" }],
      existing,
    );

    expect(result.imported).toBe(1);
    expect(result.renamed).toBe(1);
    expect(result.data.workspaces.some((workspace) => workspace.name.includes("imported"))).toBe(true);
  });

  it("does not adopt imported branchTargets", () => {
    const existing = createEmptyStoredData();
    existing.branchTargets = { "c:\\projects\\local": "safe" };

    const result = importParsedPayload(
      {
        version: 1,
        settings: existing.settings,
        workspaces: [
          {
            id: createStableId(),
            name: "Imported",
            directory: "C:\\Projects\\imported",
          },
        ],
        branchTargets: { "c:\\projects\\local": "--detach" },
      },
      existing,
    );

    expect(result.data.branchTargets).toEqual({ "c:\\projects\\local": "safe" });
  });

  it("preserves separators on replace import", () => {
    const workspaceId = "a1b2c3d4e5f6478990a1b2c3d4e5f678";
    const separatorId = "c3d4e5f6478990a1b2c3d4e5f6789012";
    const result = importParsedPayload({
      version: 1,
      settings: createEmptyStoredData().settings,
      workspaces: [
        {
          id: workspaceId,
          name: "Demo",
          directory: "C:\\Projects\\Demo",
        },
      ],
      layoutEntries: [
        { type: "separator", id: separatorId, title: "Apps" },
        { type: "workspace", workspaceId },
      ],
    });

    expect(result.data.layoutEntries?.[0]).toMatchObject({ type: "separator", id: separatorId, title: "Apps" });
    expect(result.data.layoutEntries?.some((entry) => entry.type === "workspace")).toBe(true);
  });
});
