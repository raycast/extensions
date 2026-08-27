import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuickShellStorage, WRITE_LOCK_TIMEOUT_MS, createMemoryStorageAdapter } from "../lib/storage";
import { createStableId } from "../lib/ids";
import { normalizeWorkspace } from "../lib/validation";
import { BACKUP_STORAGE_KEY, createEmptyStoredData, DEFAULT_SETTINGS } from "../lib/schema";
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

  it("does not overwrite newer schema data with an empty cache", async () => {
    const raw = JSON.stringify({
      version: 999,
      workspaces: [{ id: "keep-me", name: "Keep", directory: "C:\\Projects\\Keep" }],
      settings: {},
    });
    let stored = raw;
    const adapter = {
      getItem: async () => stored,
      setItem: async (_key: string, value: string) => {
        stored = value;
      },
    };
    const storage = new QuickShellStorage(adapter);

    await expect(storage.load()).rejects.toThrow(/Unsupported Quick Shell data version/i);
    expect(stored).toBe(raw);
  });

  it("does not overwrite malformed JSON with an empty cache", async () => {
    const raw = "{not-json";
    let stored = raw;
    const adapter = {
      getItem: async () => stored,
      setItem: async (_key: string, value: string) => {
        stored = value;
      },
    };
    const storage = new QuickShellStorage(adapter);
    const workspace = createWorkspace(createStableId(), "Keep");

    await expect(storage.load()).rejects.toThrow(/not valid JSON/i);
    expect(stored).toBe(raw);

    await expect(storage.upsertWorkspace(workspace)).rejects.toThrow(/not valid JSON/i);
    expect(stored).toBe(raw);
  });

  it("does not overwrite non-object JSON with an empty cache", async () => {
    const raw = "null";
    let stored = raw;
    const adapter = {
      getItem: async () => stored,
      setItem: async (_key: string, value: string) => {
        stored = value;
      },
    };
    const storage = new QuickShellStorage(adapter);

    await expect(storage.load()).rejects.toThrow(/malformed/i);
    expect(stored).toBe(raw);
  });

  it("preserves lastUsedUtc when editing a workspace after markUsed", async () => {
    const storage = new QuickShellStorage(createMemoryStorageAdapter());
    const workspace = createWorkspace(createStableId(), "Recents");
    await storage.upsertWorkspace(workspace);

    const usedAt = new Date("2026-07-22T18:00:00.000Z");
    await storage.markWorkspaceUsed(workspace.id, usedAt);
    await storage.flushRecentWrites();

    const staleEdit = {
      ...workspace,
      name: "Recents Renamed",
      lastUsedUtc: "2026-01-01T00:00:00.000Z",
    };
    await storage.upsertWorkspace(staleEdit);

    const loaded = await storage.getWorkspaces();
    expect(loaded[0].name).toBe("Recents Renamed");
    expect(loaded[0].lastUsedUtc).toBe(usedAt.toISOString());
  });

  it("serializes overlapping mutations so the later write cannot clobber the earlier one", async () => {
    const storage = new QuickShellStorage(createMemoryStorageAdapter());
    const first = createWorkspace(createStableId(), "Alpha");
    const second = createWorkspace(createStableId(), "Beta");

    await Promise.all([storage.upsertWorkspace(first), storage.upsertWorkspace(second)]);

    const loaded = await storage.getWorkspaces();
    expect(loaded).toHaveLength(2);
    expect(loaded.map((workspace) => workspace.name).sort()).toEqual(["Alpha", "Beta"]);
  });

  it("serializes overlapping mutations on the same workspace so both updates survive", async () => {
    const storage = new QuickShellStorage(createMemoryStorageAdapter());
    const id = createStableId();
    const workspace = createWorkspace(id, "Alpha");
    await storage.upsertWorkspace(workspace);

    const usedAt = new Date("2026-07-01T12:00:00.000Z");
    await Promise.all([storage.setFavorite(id, true), storage.markWorkspaceUsed(id, usedAt)]);
    await storage.flushRecentWrites();

    const loaded = await storage.getWorkspaces();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].isPinned).toBe(true);
    expect(loaded[0].lastUsedUtc).toBe(usedAt.toISOString());
  });

  it("queues a second mutation that starts while the first writer is awaiting storage I/O", async () => {
    let releaseFirstWrite!: () => void;
    const firstWriteGate = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve;
    });
    let signalFirstWriteStarted!: () => void;
    const firstWriteStarted = new Promise<void>((resolve) => {
      signalFirstWriteStarted = resolve;
    });
    let writeCount = 0;
    const writeOrder: string[] = [];

    const base = createMemoryStorageAdapter();
    const adapter = {
      getItem: (key: string) => base.getItem(key),
      async setItem(key: string, value: string) {
        writeCount += 1;
        const id = writeCount;
        writeOrder.push(`start:${id}`);
        if (id === 1) {
          signalFirstWriteStarted();
          await firstWriteGate;
        }
        await base.setItem(key, value);
        writeOrder.push(`end:${id}`);
      },
    };

    const storage = new QuickShellStorage(adapter);
    const first = createWorkspace(createStableId(), "Alpha");
    const second = createWorkspace(createStableId(), "Beta");

    const firstUpsert = storage.upsertWorkspace(first);
    await firstWriteStarted;
    const secondUpsert = storage.upsertWorkspace(second);
    releaseFirstWrite();
    await Promise.all([firstUpsert, secondUpsert]);

    // Without the lock, the second persist would start before the first ended.
    expect(writeOrder).toEqual(["start:1", "end:1", "start:2", "end:2"]);

    const loaded = await storage.getWorkspaces();
    expect(loaded).toHaveLength(2);
    expect(loaded.map((workspace) => workspace.name).sort()).toEqual(["Alpha", "Beta"]);
  });

  it("resetAll is a no-op when empty", async () => {
    const storage = new QuickShellStorage(createMemoryStorageAdapter());
    const result = await storage.resetAll();
    expect(result.success).toBe(true);
    expect(result.outcome).toBe("noop");
    expect(result.message).toMatch(/no workspaces/i);
    expect(await storage.hasBackup()).toBe(false);
  });

  it("resetAll clears workspaces, keeps undo, preserves settings, and writes a durable backup", async () => {
    const adapter = createMemoryStorageAdapter();
    const storage = new QuickShellStorage(adapter);
    const id = createStableId();
    const workspace = createWorkspace(id, "Alpha");
    const initialSettings = {
      ...DEFAULT_SETTINGS,
      terminalApplication: "conhost" as const,
      recentWorkspaceCount: 3,
    };
    await storage.updateSettings(initialSettings);
    await storage.upsertWorkspace(workspace);

    const result = await storage.resetAll();
    expect(result.success).toBe(true);
    expect(result.outcome).toBe("reset");
    expect(await storage.getWorkspaces()).toHaveLength(0);
    expect(await storage.getSettings()).toEqual(initialSettings);
    expect(await storage.hasBackup()).toBe(true);
    expect(storage.canUndo()).toBe(true);

    const backupRaw = await adapter.getItem(BACKUP_STORAGE_KEY);
    expect(backupRaw).toBeTruthy();
    const backup = JSON.parse(backupRaw as string) as { workspaces: Array<{ id: string; name: string }> };
    expect(backup.workspaces).toHaveLength(1);
    expect(backup.workspaces[0].id).toBe(workspace.id);
    expect(backup.workspaces[0].name).toBe("Alpha");

    await storage.undo();
    expect(await storage.getWorkspaces()).toHaveLength(1);
    expect((await storage.getWorkspaces())[0].name).toBe("Alpha");
  });

  it("restoreFromBackup recovers after a simulated extension restart", async () => {
    const adapter = createMemoryStorageAdapter();
    const first = new QuickShellStorage(adapter);
    const id = createStableId();
    await first.upsertWorkspace(createWorkspace(id, "Alpha"));
    await first.resetAll();
    expect(await first.getWorkspaces()).toHaveLength(0);

    // New instance has no in-memory undo, but the durable backup remains.
    const restarted = new QuickShellStorage(adapter);
    expect(await restarted.hasBackup()).toBe(true);
    const restored = await restarted.restoreFromBackup();
    expect(restored.success).toBe(true);
    expect(restored.outcome).toBe("restored");
    expect(await restarted.getWorkspaces()).toHaveLength(1);
    expect((await restarted.getWorkspaces())[0].name).toBe("Alpha");
  });

  it("restoreFromBackup replaces workspaces but keeps current settings", async () => {
    const adapter = createMemoryStorageAdapter();
    const first = new QuickShellStorage(adapter);
    await first.upsertWorkspace(createWorkspace(createStableId(), "Alpha"));
    await first.resetAll();

    const postResetSettings = {
      ...DEFAULT_SETTINGS,
      terminalApplication: "conhost" as const,
      recentWorkspaceCount: 7,
    };
    await first.updateSettings(postResetSettings);

    const restored = await first.restoreFromBackup();
    expect(restored.outcome).toBe("restored");
    expect(await first.getWorkspaces()).toHaveLength(1);
    expect(await first.getSettings()).toEqual(postResetSettings);
  });

  it("restoreFromBackup discards corrupt backup JSON so later calls can recover", async () => {
    const adapter = createMemoryStorageAdapter();
    await adapter.setItem(BACKUP_STORAGE_KEY, "{not-json");
    const storage = new QuickShellStorage(adapter);

    const result = await storage.restoreFromBackup();
    expect(result.success).toBe(true);
    expect(result.outcome).toBe("discarded");
    expect(result.message).toMatch(/not valid JSON/i);
    expect(await storage.hasBackup()).toBe(false);

    const again = await storage.restoreFromBackup();
    expect(again.outcome).toBe("noop");
    expect(again.message).toMatch(/no workspace backup/i);
  });

  it.each([null, {}, [], { version: 1 }])("restoreFromBackup discards malformed backup %p", async (backup) => {
    const adapter = createMemoryStorageAdapter();
    await adapter.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backup));
    const storage = new QuickShellStorage(adapter);

    const existing = await storage.upsertWorkspace(createWorkspace(createStableId(), "KeepMe"));

    const result = await storage.restoreFromBackup();
    expect(result.success).toBe(true);
    expect(result.outcome).toBe("discarded");
    expect(result.message).toMatch(/malformed/i);
    expect(await storage.hasBackup()).toBe(false);

    const workspaces = await storage.getWorkspaces();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].id).toBe(existing.id);
  });

  it("restoreFromBackup does not rehydrate trust for workspaces without explicit backup security", async () => {
    const adapter = createMemoryStorageAdapter();
    const first = new QuickShellStorage(adapter);
    const id = createStableId();
    await first.upsertWorkspace(createWorkspace(id, "Alpha"));
    await first.resetAll();

    // Replace the backup with a syntactically valid shape that omits workspaceSecurity.
    const backupRaw = (await adapter.getItem(BACKUP_STORAGE_KEY)) as string;
    const backup = JSON.parse(backupRaw);
    delete backup.workspaceSecurity;
    await adapter.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backup));

    const restarted = new QuickShellStorage(adapter);
    await restarted.restoreFromBackup();

    const security = await restarted.getWorkspaceSecurityMap();
    expect(security[id].isTrusted).toBe(false);
  });

  it("restoreFromBackup preserves explicit trusted security from the backup", async () => {
    const adapter = createMemoryStorageAdapter();
    const first = new QuickShellStorage(adapter);
    const id = createStableId();
    const workspace = createWorkspace(id, "Alpha");
    await first.upsertWorkspace(workspace);
    const stored = await first.getStoredWorkspace(id);
    expect(stored).not.toBeNull();
    await first.grantTrust(id, createReviewToken(stored!));
    await first.resetAll();

    const restarted = new QuickShellStorage(adapter);
    await restarted.restoreFromBackup();

    const security = await restarted.getWorkspaceSecurityMap();
    expect(security[id].isTrusted).toBe(true);
    expect(security[id].revision).toBeGreaterThanOrEqual(1);
  });

  it("withWriteLock reports a timeout diagnostic when the previous writer stalls", async () => {
    vi.useFakeTimers();
    try {
      const base = createMemoryStorageAdapter();
      const adapter = {
        getItem: base.getItem,
        setItem: () => new Promise<void>(() => {}),
      };
      const storage = new QuickShellStorage(adapter);

      const workspace = createWorkspace(createStableId(), "Alpha");
      const first = storage.upsertWorkspace(workspace);
      const second = storage.upsertWorkspace(createWorkspace(createStableId(), "Beta"));

      vi.advanceTimersByTime(WRITE_LOCK_TIMEOUT_MS + 1);

      await expect(second).rejects.toThrow(/lock-timeout/);

      // Let the first promise hang; it has no rejection listener, but fake timers
      // mean its wait timer will not produce an unhandled rejection in this test.
      first.catch(() => {});
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects nested write locks instead of deadlocking", async () => {
    const storage = new QuickShellStorage(createMemoryStorageAdapter());
    type LockHost = {
      withWriteLock: <T>(operation: () => Promise<T>) => Promise<T>;
    };
    const locked = storage as unknown as LockHost;

    await expect(locked.withWriteLock(async () => locked.withWriteLock(async () => "nested"))).rejects.toThrow(
      /Nested QuickShellStorage write lock/,
    );
  });
});
