import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createBackupDocument,
  PortabilityError,
  serializeBackupDocument,
  type WorktodoBackupDocument,
  type WorktodoSnapshot,
} from "../../src/shared/portability/backup-contract";
import { readBackupFile, snapshotFingerprint } from "../../src/shared/portability/import-preview";
import { PortabilityService } from "../../src/shared/portability/portability-service";
import type { ReplaceableTaskRepository } from "../../src/shared/portability/replace-backup";

const temporaryDirectories: string[] = [];

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function populatedSnapshot(): WorktodoSnapshot {
  return {
    projects: [{ id: id(1), name: "Work", position: 1_024, createdAtMs: 100, updatedAtMs: 100 }],
    labels: [
      {
        id: id(2),
        name: "Next",
        position: 1_024,
        createdAtMs: 100,
        updatedAtMs: 100,
      },
    ],
    tasks: [task(3, null, null), task(4, 200, null), task(5, null, 300), task(6, 200, 300)],
  };
}

function task(index: number, completedAtMs: number | null, trashedAtMs: number | null) {
  return {
    id: id(index),
    title: `Task ${index}`,
    notes: "",
    priority: false,
    position: 1_024,
    projectId: null,
    labelIds: [],
    due: { kind: "none" as const },
    createdAtMs: 100,
    updatedAtMs: Math.max(completedAtMs ?? 100, trashedAtMs ?? 100),
    completedAtMs,
    trashedAtMs,
  };
}

async function temporaryPath(name: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "worktodo-import-preview-test-"));
  temporaryDirectories.push(directory);
  return join(directory, name);
}

function expectCode(operation: () => unknown, code: PortabilityError["code"]): PortabilityError {
  try {
    operation();
    throw new Error("Expected a portability error");
  } catch (error) {
    expect(error).toBeInstanceOf(PortabilityError);
    expect((error as PortabilityError).code).toBe(code);
    return error as PortabilityError;
  }
}

function serviceFor(current: WorktodoSnapshot, transaction = vi.fn(<Result>(operation: () => Result) => operation())) {
  const repository = {
    transaction,
    listProjects: () => current.projects,
    listLabels: () => current.labels,
    listTasks: () => current.tasks,
  } as unknown as ReplaceableTaskRepository;
  return { service: new PortabilityService(repository, "/tmp/recovery", () => 10_000), transaction };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Worktodo import validation and preview", () => {
  it("reads one complete UTF-8 JSON backup and reports mutually exclusive counts", async () => {
    const path = await temporaryPath("backup.json");
    const document = createBackupDocument(9_000, populatedSnapshot());
    await writeFile(path, serializeBackupDocument(document), "utf8");

    const prepared = serviceFor({ projects: [], labels: [], tasks: [] }).service.prepare(path);
    expect(prepared.document).toEqual(document);
    expect(prepared.currentFingerprint).toBe(snapshotFingerprint({ projects: [], labels: [], tasks: [] }));
    expect(prepared.preview).toEqual({
      formatVersion: 3,
      exportedAtMs: 9_000,
      incoming: {
        projects: 1,
        labels: 1,
        tasks: 4,
        lifecycle: {
          activeIncomplete: 1,
          activeCompleted: 1,
          trashedIncomplete: 1,
          trashedCompleted: 1,
        },
      },
      current: {
        projects: 0,
        labels: 0,
        tasks: 0,
        lifecycle: {
          activeIncomplete: 0,
          activeCompleted: 0,
          trashedIncomplete: 0,
          trashedCompleted: 0,
        },
      },
      confirmationTitle: "Replace Worktodo data",
      warning: "This will replace all current Worktodo data. Cancelling changes nothing.",
    });
  });

  it("validates the selected file before reading current production state", async () => {
    const path = await temporaryPath("invalid.json");
    await writeFile(path, "{", "utf8");
    const { service, transaction } = serviceFor(populatedSnapshot());

    const error = expectCode(() => service.prepare(path), "INVALID_DOCUMENT");
    expect(error.message).toContain("Worktodo data was not changed.");
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([
    ["relative paths", "backup.json", "INVALID_IMPORT_FILE"],
    ["wrong extensions", "/tmp/backup.txt", "INVALID_IMPORT_FILE"],
  ])("rejects %s", (_label, path, code) => {
    expectCode(() => serviceFor(populatedSnapshot()).service.prepare(path), code as PortabilityError["code"]);
  });

  it("rejects missing files, directories, oversized files, and invalid UTF-8", async () => {
    const missing = await temporaryPath("missing.json");
    expectCode(() => serviceFor(populatedSnapshot()).service.prepare(missing), "INVALID_IMPORT_FILE");

    const directoryPath = await temporaryPath("directory.json");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(directoryPath));
    expectCode(() => serviceFor(populatedSnapshot()).service.prepare(directoryPath), "INVALID_IMPORT_FILE");

    const oversized = await temporaryPath("oversized.json");
    await writeFile(oversized, "12345", "utf8");
    expectCode(() => readBackupFile(oversized, 4), "FILE_TOO_LARGE");

    const invalidUtf8 = await temporaryPath("invalid-utf8.json");
    await writeFile(invalidUtf8, Buffer.from([0xff]));
    expectCode(() => serviceFor(populatedSnapshot()).service.prepare(invalidUtf8), "INVALID_DOCUMENT");
  });

  it.each([
    [
      "unsupported versions",
      (document: WorktodoBackupDocument) => ({ ...document, version: 4 }),
      "UNSUPPORTED_VERSION",
    ],
    [
      "broken relationships",
      (document: WorktodoBackupDocument) => ({
        ...document,
        tasks: [{ ...document.tasks[0], labelIds: [id(999)] }, ...document.tasks.slice(1)],
      }),
      "BROKEN_RELATIONSHIP",
    ],
    [
      "duplicate IDs",
      (document: WorktodoBackupDocument) => ({ ...document, tasks: [...document.tasks, document.tasks[0]] }),
      "DUPLICATE_ID",
    ],
  ])("rejects %s through prepare", async (_label, mutate, code) => {
    const path = await temporaryPath("invalid-backup.json");
    await writeFile(path, JSON.stringify(mutate(createBackupDocument(9_000, populatedSnapshot()))), "utf8");

    expectCode(() => serviceFor(populatedSnapshot()).service.prepare(path), code as PortabilityError["code"]);
  });

  it("calls the current snapshot reader only after a valid document", async () => {
    const path = await temporaryPath("backup.json");
    await writeFile(path, serializeBackupDocument(createBackupDocument(9_000, populatedSnapshot())), "utf8");
    const current = { projects: [], labels: [], tasks: [] };
    const { service, transaction } = serviceFor(current);

    const prepared = service.prepare(path);
    expect(transaction).toHaveBeenCalledOnce();
    expect(prepared.preview.current.tasks).toBe(0);
    expect(prepared.document.tasks).toHaveLength(4);
  });

  it("fingerprints the complete canonical current snapshot", () => {
    const current = populatedSnapshot();
    const original = snapshotFingerprint(current);
    expect(
      snapshotFingerprint({
        projects: [...current.projects].reverse(),
        labels: [...current.labels].reverse(),
        tasks: [...current.tasks].reverse(),
      }),
    ).toBe(original);

    const mutations: WorktodoSnapshot[] = [
      { ...current, projects: [{ ...current.projects[0], name: "Personal" }] },
      { ...current, labels: [{ ...current.labels[0], name: "Later" }] },
      { ...current, tasks: [{ ...current.tasks[0], title: "Changed" }, ...current.tasks.slice(1)] },
      { ...current, tasks: [{ ...current.tasks[0], notes: "Changed" }, ...current.tasks.slice(1)] },
      { ...current, tasks: [{ ...current.tasks[0], priority: true }, ...current.tasks.slice(1)] },
      { ...current, tasks: [{ ...current.tasks[0], position: 2_048 }, ...current.tasks.slice(1)] },
      {
        ...current,
        tasks: [{ ...current.tasks[0], due: { kind: "allDay", date: "2026-09-06" } }, ...current.tasks.slice(1)],
      },
      { ...current, tasks: [{ ...current.tasks[0], projectId: current.projects[0].id }, ...current.tasks.slice(1)] },
      { ...current, tasks: [{ ...current.tasks[0], labelIds: [current.labels[0].id] }, ...current.tasks.slice(1)] },
      { ...current, tasks: [{ ...current.tasks[0], updatedAtMs: 101 }, ...current.tasks.slice(1)] },
      {
        ...current,
        tasks: [{ ...current.tasks[0], updatedAtMs: 200, completedAtMs: 200 }, ...current.tasks.slice(1)],
      },
    ];

    expect(mutations.map(snapshotFingerprint)).not.toContain(original);
  });
});
