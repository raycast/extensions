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

  it("appends imported CmdPal separators when merging into existing layout", () => {
    const existingId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const existing = createEmptyStoredData();
    existing.workspaces.push(
      normalizeWorkspace({
        id: existingId,
        name: "Local",
        abbreviation: null,
        directory: "C:\\Projects\\local",
        isPinned: false,
        pinOrder: null,
        lastUsedUtc: null,
        terminal: "default",
        wtProfile: null,
        command: null,
        runAsAdmin: false,
        launches: [],
      }),
    );
    existing.layoutEntries = [
      { type: "separator", id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", title: "Mine" },
      { type: "workspace", workspaceId: existingId },
    ];

    const result = importParsedPayload(
      {
        version: 1,
        entries: [
          {
            Id: "cccccccccccccccccccccccccccccccc",
            Name: "Imported",
            Directory: "C:\\Projects\\imported",
          },
          { Type: "separator", Title: "From desktop" },
          {
            Id: "dddddddddddddddddddddddddddddddd",
            Name: "Other",
            Directory: "C:\\Projects\\other",
          },
        ],
      },
      existing,
    );

    expect(result.imported).toBe(2);
    expect(result.data.layoutEntries).toEqual([
      { type: "separator", id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", title: "Mine" },
      { type: "workspace", workspaceId: existingId },
      { type: "workspace", workspaceId: result.data.workspaces[1].id },
      { type: "separator", id: expect.any(String), title: "From desktop" },
      { type: "workspace", workspaceId: result.data.workspaces[2].id },
    ]);
  });

  it("imports CmdPal layout envelope with flat PascalCase shortcuts", () => {
    const result = importParsedPayload({
      version: 1,
      entries: [
        {
          Id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          Name: "Frontend",
          Directory: "C:\\Projects\\web",
          Command: "npm run dev",
          Terminal: "wt",
          Launches: [
            {
              Id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
              Label: "Web",
              Terminal: "wt",
              Command: "npm run dev",
              RunAsAdmin: false,
              IsEnabled: true,
              Order: 0,
              TaskType: "none",
            },
          ],
        },
        { Type: "separator", Title: "Apps" },
        {
          Id: "cccccccccccccccccccccccccccccccc",
          Name: "API",
          Directory: "C:\\Projects\\api",
          Terminal: "default",
        },
      ],
    });

    expect(result.imported).toBe(2);
    expect(result.data.workspaces.map((workspace) => workspace.name)).toEqual(["Frontend", "API"]);
    expect(result.data.workspaces[0].launches[0]?.label).toBe("Web");
    expect(result.data.layoutEntries).toEqual([
      { type: "workspace", workspaceId: result.data.workspaces[0].id },
      { type: "separator", id: expect.any(String), title: "Apps" },
      { type: "workspace", workspaceId: result.data.workspaces[1].id },
    ]);
  });

  it("omits skipped duplicate CmdPal entries from layout without shifting later rows", () => {
    const result = importParsedPayload({
      version: 1,
      entries: [
        {
          Id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          Name: "Dup",
          Directory: "C:\\Projects\\a",
        },
        { Type: "separator", Title: "Mid" },
        {
          Id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          Name: "Dup",
          Directory: "C:\\Projects\\b",
        },
        {
          Id: "cccccccccccccccccccccccccccccccc",
          Name: "Dup",
          Directory: "C:\\Projects\\c",
        },
        {
          Id: "dddddddddddddddddddddddddddddddd",
          Name: "Other",
          Directory: "C:\\Projects\\d",
        },
      ],
    });

    // First kept, second renamed, third skipped, fourth kept.
    expect(result.imported).toBe(3);
    expect(result.skipped).toBe(1);
    expect(result.renamed).toBe(1);
    expect(result.data.workspaces.map((workspace) => workspace.name)).toEqual(["Dup", "Dup (imported)", "Other"]);
    expect(result.data.layoutEntries).toEqual([
      { type: "workspace", workspaceId: result.data.workspaces[0].id },
      { type: "separator", id: expect.any(String), title: "Mid" },
      { type: "workspace", workspaceId: result.data.workspaces[1].id },
      { type: "workspace", workspaceId: result.data.workspaces[2].id },
    ]);
  });

  it("assigns unique ids when CmdPal entries repeat the same source id", () => {
    const sharedId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const result = importParsedPayload({
      version: 1,
      entries: [
        {
          Id: sharedId,
          Name: "First",
          Directory: "C:\\Projects\\a",
        },
        { Type: "separator", Title: "Mid" },
        {
          Id: sharedId,
          Name: "Second",
          Directory: "C:\\Projects\\b",
        },
      ],
    });

    expect(result.imported).toBe(2);
    expect(result.data.workspaces[0].id).not.toBe(result.data.workspaces[1].id);
    expect(result.data.layoutEntries).toEqual([
      { type: "workspace", workspaceId: result.data.workspaces[0].id },
      { type: "separator", id: expect.any(String), title: "Mid" },
      { type: "workspace", workspaceId: result.data.workspaces[1].id },
    ]);
  });

  it("imports on-disk CmdPal shortcuts.json Workspace/Security wrappers", () => {
    const result = importParsedPayload({
      version: 1,
      entries: [
        {
          Workspace: {
            Id: "dddddddddddddddddddddddddddddddd",
            Name: "Trackdub",
            Directory: "D:\\Dev\\Trackdub",
            Terminal: "default",
            Launches: [
              {
                Id: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                Label: "Launch",
                Terminal: "default",
                Command: "cline",
                RunAsAdmin: false,
                IsEnabled: true,
                Order: 0,
              },
            ],
          },
          Security: { IsTrusted: true, Revision: 3 },
        },
      ],
    });

    expect(result.imported).toBe(1);
    expect(result.data.workspaces[0].name).toBe("Trackdub");
    expect(result.data.workspaces[0].directory).toBe("D:\\Dev\\Trackdub");
    expect(result.data.workspaces[0].launches[0]?.command).toBe("cline");
  });
});
