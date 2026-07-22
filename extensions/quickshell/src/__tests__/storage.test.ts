import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QuickShellStorage, createMemoryStorageAdapter } from "../lib/storage";
import { createStableId } from "../lib/ids";
import { normalizeWorkspace } from "../lib/validation";
import { createEmptyStoredData } from "../lib/schema";
import { createReviewToken, matchesReviewToken, setWorkspaceTrustEnabledForTests } from "../lib/security";

beforeEach(() => {
  setWorkspaceTrustEnabledForTests(true);
});

afterEach(() => {
  setWorkspaceTrustEnabledForTests(null);
});

function createWorkspace(id: string, name: string) {
  return normalizeWorkspace({
    id,
    name,
    abbreviation: null,
    directory: `C:\\Projects\\${name}`,
    isPinned: false,
    pinOrder: null,
    lastUsedUtc: null,
    terminal: "default",
    wtProfile: null,
    command: null,
    runAsAdmin: false,
    launches: [
      {
        id: createStableId(),
        label: "Launch",
        terminal: "default",
        wtProfile: null,
        command: null,
        runAsAdmin: false,
        isEnabled: true,
        order: 0,
        taskType: "none",
      },
    ],
  });
}

describe("storage", () => {
  it("persists and reloads workspaces", async () => {
    const storage = new QuickShellStorage(createMemoryStorageAdapter());
    const workspace = normalizeWorkspace({
      id: createStableId(),
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
          id: createStableId(),
          label: "Web",
          terminal: "default",
          wtProfile: null,
          command: "npm run dev",
          runAsAdmin: false,
          isEnabled: true,
          order: 0,
          taskType: "none",
        },
      ],
    });

    await storage.upsertWorkspace(workspace);
    const loaded = await storage.getWorkspaces();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("Demo");
  });

  it("marks workspace usage for recents", async () => {
    const storage = new QuickShellStorage(createMemoryStorageAdapter());
    const id = createStableId();
    await storage.upsertWorkspace(
      normalizeWorkspace({
        id,
        name: "Demo",
        abbreviation: null,
        directory: "C:\\Projects\\Demo",
        isPinned: false,
        pinOrder: null,
        lastUsedUtc: null,
        terminal: "default",
        wtProfile: null,
        command: null,
        runAsAdmin: false,
        launches: [
          {
            id: createStableId(),
            label: "Launch",
            terminal: "default",
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

    await storage.markWorkspaceUsed(id, new Date("2026-07-06T12:00:00.000Z"));
    await storage.flushRecentWrites();
    const loaded = await storage.getWorkspaces();
    expect(loaded[0].lastUsedUtc).toBe("2026-07-06T12:00:00.000Z");
  });

  it("persists settings updates", async () => {
    const storage = new QuickShellStorage(createMemoryStorageAdapter());
    await storage.updateSettings({
      terminalApplication: "conhost",
      defaultProfile: "pwsh",
      recentWorkspaceCount: 0,
      multiLaunchPresentation: "separateWindows",
      blockDirtyBranchSwitch: true,
    });

    const settings = await storage.getSettings();
    expect(settings.terminalApplication).toBe("conhost");
    expect(settings.defaultProfile).toBe("pwsh");
    expect(settings.recentWorkspaceCount).toBe(0);
    expect(settings.multiLaunchPresentation).toBe("separateWindows");
  });

  it("does not record undo history when save validation fails", async () => {
    const storage = new QuickShellStorage(createMemoryStorageAdapter());
    const id = createStableId();
    await storage.upsertWorkspace(
      normalizeWorkspace({
        id,
        name: "Before",
        abbreviation: null,
        directory: "C:\\Projects\\Before",
        isPinned: false,
        pinOrder: null,
        lastUsedUtc: null,
        terminal: "default",
        wtProfile: null,
        command: null,
        runAsAdmin: false,
        launches: [
          {
            id: createStableId(),
            label: "Launch",
            terminal: "default",
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

    await expect(
      storage.save({
        version: 1,
        settings: {
          terminalApplication: "wt",
          defaultProfile: "__default__",
          recentWorkspaceCount: 8,
          multiLaunchPresentation: "singleWindowTabs",
          blockDirtyBranchSwitch: true,
        },
        workspaces: [
          normalizeWorkspace({
            id,
            name: "",
            abbreviation: null,
            directory: "C:\\Projects\\Before",
            isPinned: false,
            pinOrder: null,
            lastUsedUtc: null,
            terminal: "default",
            wtProfile: null,
            command: null,
            runAsAdmin: false,
            launches: [
              {
                id: createStableId(),
                label: "Launch",
                terminal: "default",
                wtProfile: null,
                command: null,
                runAsAdmin: false,
                isEnabled: true,
                order: 0,
                taskType: "none",
              },
            ],
          }),
        ],
      }),
    ).rejects.toThrow();

    expect(await storage.getWorkspaces()).toHaveLength(1);
    await storage.undo();
    expect(await storage.getWorkspaces()).toHaveLength(0);
    expect(storage.canUndo()).toBe(false);
  });

  it("supports undo after workspace changes", async () => {
    const storage = new QuickShellStorage(createMemoryStorageAdapter());
    const id = createStableId();
    await storage.upsertWorkspace(
      normalizeWorkspace({
        id,
        name: "Before",
        abbreviation: null,
        directory: "C:\\Projects\\Before",
        isPinned: false,
        pinOrder: null,
        lastUsedUtc: null,
        terminal: "default",
        wtProfile: null,
        command: null,
        runAsAdmin: false,
        launches: [
          {
            id: createStableId(),
            label: "Launch",
            terminal: "default",
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

    await storage.deleteWorkspace(id);
    expect(await storage.getWorkspaces()).toHaveLength(0);
    await storage.undo();
    expect(await storage.getWorkspaces()).toHaveLength(1);
    expect((await storage.getWorkspaces())[0].name).toBe("Before");
  });

  it("persists imported replace security authoritatively on an ID collision", async () => {
    const id = createStableId();
    const initial = createEmptyStoredData();
    initial.workspaces = [createWorkspace(id, "Trusted")];
    initial.workspaceSecurity = { [id]: { isTrusted: true, revision: 7 } };
    const storage = new QuickShellStorage(createMemoryStorageAdapter(initial));
    await storage.load();

    await storage.importJson(
      JSON.stringify({
        version: 1,
        workspaces: [{ ...createWorkspace(id, "Imported"), directory: "C:\\Projects\\Imported" }],
        settings: initial.settings,
      }),
      "replace",
    );

    expect(await storage.getWorkspaceSecurity(id)).toEqual({ isTrusted: false, revision: 1 });
  });

  it("duplicates an untrusted workspace atomically and preserves unrelated trust", async () => {
    const sourceId = createStableId();
    const unrelatedId = createStableId();
    const initial = createEmptyStoredData();
    initial.workspaces = [createWorkspace(sourceId, "Source"), createWorkspace(unrelatedId, "Unrelated")];
    initial.workspaceSecurity = {
      [sourceId]: { isTrusted: false, revision: 9 },
      [unrelatedId]: { isTrusted: true, revision: 4 },
    };
    const storage = new QuickShellStorage(createMemoryStorageAdapter(initial));
    await storage.load();

    const duplicate = await storage.duplicateWorkspace(sourceId);

    expect(await storage.getWorkspaceSecurity(duplicate.id)).toEqual({ isTrusted: false, revision: 1 });
    expect(await storage.getWorkspaceSecurity(unrelatedId)).toEqual({ isTrusted: true, revision: 4 });
    expect(await storage.undo()).toBe(true);
    expect(await storage.getWorkspaces()).toHaveLength(2);
    expect(await storage.undo()).toBe(false);
  });

  it("increments trust revision when undo restores different execution content", async () => {
    const id = createStableId();
    const initial = createEmptyStoredData();
    initial.workspaces = [
      {
        ...createWorkspace(id, "History"),
        devServerUrl: "https://localhost:5173",
        openDevServerOnLaunch: false,
      },
    ];
    initial.workspaceSecurity = { [id]: { isTrusted: true, revision: 3 } };
    const storage = new QuickShellStorage(createMemoryStorageAdapter(initial));
    await storage.load();

    const before = await storage.getStoredWorkspace(id);
    await storage.upsertWorkspace({
      ...before!.content,
      openDevServerOnLaunch: true,
    });
    const reviewed = (await storage.getStoredWorkspace(id))!;
    const token = createReviewToken(reviewed);

    await storage.undo();
    const restored = (await storage.getStoredWorkspace(id))!;

    expect(restored.revision).toBe(reviewed.revision + 1);
    expect(restored.security.isTrusted).toBe(true);
    expect(matchesReviewToken(restored, token)).toBe(false);
  });
});
