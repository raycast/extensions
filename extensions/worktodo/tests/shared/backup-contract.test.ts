import { describe, expect, it } from "vitest";
import {
  canonicalBackupDocument,
  createBackupDocument,
  parseBackupDocument,
  parseBackupJson,
  PortabilityError,
  serializeBackupDocument,
  type WorktodoBackupDocument,
} from "../../src/shared/portability/backup-contract";
import { MAX_REPRESENTABLE_TIMESTAMP_MS } from "../../src/shared/domain/validation";

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function completeDocument(): WorktodoBackupDocument {
  return createBackupDocument(9_000, {
    projects: [
      { id: id(2), name: "Personal", position: 1_024, createdAtMs: 100, updatedAtMs: 200 },
      { id: id(1), name: "Work", position: 1_024, createdAtMs: 100, updatedAtMs: 100 },
    ],
    labels: [
      {
        id: id(4),
        name: "Later",
        position: 1_024,
        createdAtMs: 200,
        updatedAtMs: 200,
      },
      {
        id: id(3),
        name: "Next",
        position: 1_024,
        createdAtMs: 100,
        updatedAtMs: 100,
      },
    ],
    tasks: [
      {
        id: id(8),
        title: "Trashed and completed",
        notes: "Unicode note: café ☕",
        priority: true,
        position: 1_024,
        projectId: id(1),
        labelIds: [id(4), id(3)],
        due: { kind: "timed", instantMs: 8_000, timeZone: "Australia/Melbourne" },
        createdAtMs: 100,
        updatedAtMs: 400,
        completedAtMs: 300,
        trashedAtMs: 400,
      },
      {
        id: id(7),
        title: "Trashed incomplete",
        notes: "",
        priority: false,
        position: 1_024,
        projectId: id(1),
        labelIds: [],
        due: { kind: "allDay", date: "2028-02-29" },
        createdAtMs: 100,
        updatedAtMs: 300,
        completedAtMs: null,
        trashedAtMs: 300,
      },
      {
        id: id(6),
        title: "Completed no-project task",
        notes: "Plain notes",
        priority: false,
        position: 1_024,
        projectId: null,
        labelIds: [],
        due: { kind: "none" },
        createdAtMs: 100,
        updatedAtMs: 200,
        completedAtMs: 200,
        trashedAtMs: null,
      },
      {
        id: id(5),
        title: "Active no-project task",
        notes: "",
        priority: false,
        position: 1_024,
        projectId: null,
        labelIds: [],
        due: { kind: "none" },
        createdAtMs: 100,
        updatedAtMs: 100,
        completedAtMs: null,
        trashedAtMs: null,
      },
    ],
  });
}

function expectCode(operation: () => unknown, code: PortabilityError["code"]): void {
  try {
    operation();
    throw new Error("Expected a portability error");
  } catch (error) {
    expect(error).toBeInstanceOf(PortabilityError);
    expect((error as PortabilityError).code).toBe(code);
  }
}

function version1Task(task: Record<string, unknown>): Record<string, unknown> {
  const converted: Record<string, unknown> = { ...task };
  delete converted.labelIds;
  return converted;
}

describe("Worktodo backup contract", () => {
  it("round-trips every supported state as deterministic readable JSON", () => {
    const document = completeDocument();
    const serialized = serializeBackupDocument(document);

    expect(serialized.endsWith("\n")).toBe(true);
    expect(serialized).toContain('\n  "format": "worktodo-backup"');
    expect(parseBackupJson(serialized)).toEqual(canonicalBackupDocument(document));
    expect(parseBackupJson(serialized).projects.map((project) => project.id)).toEqual([id(1), id(2)]);
    expect(parseBackupJson(serialized).tasks.at(-1)?.labelIds).toEqual([id(3), id(4)]);
    expect(parseBackupJson(serialized).tasks.map((task) => task.id)).toEqual([id(5), id(6), id(7), id(8)]);
  });

  it("rejects malformed JSON and unsupported versions with bounded codes", () => {
    expectCode(() => parseBackupJson("{"), "INVALID_DOCUMENT");
    expectCode(() => parseBackupDocument({ ...completeDocument(), version: 4 }), "UNSUPPORTED_VERSION");
    const missingVersion: Record<string, unknown> = { ...completeDocument() };
    delete missingVersion.version;
    expectCode(() => parseBackupDocument(missingVersion), "INVALID_MODEL");
  });

  it.each([1, 2, 3])("rejects an unrepresentable export timestamp in version %s", (version) => {
    const document = completeDocument() as WorktodoBackupDocument & Record<string, unknown>;
    const candidate: Record<string, unknown> = {
      ...document,
      version,
      exportedAtMs: MAX_REPRESENTABLE_TIMESTAMP_MS + 1,
    };
    if (version === 1) {
      candidate.sections = [];
      candidate.tasks = [];
      delete candidate.labels;
    } else if (version === 2) {
      candidate.tasks = [];
    }
    expectCode(() => parseBackupDocument(candidate), "INVALID_MODEL");
  });

  it.each([
    ["unknown top-level fields", (document: WorktodoBackupDocument) => ({ ...document, unexpected: true })],
    [
      "unknown entity fields",
      (document: WorktodoBackupDocument) => ({
        ...document,
        projects: [{ ...document.projects[0], unexpected: true }, ...document.projects.slice(1)],
      }),
    ],
    [
      "uppercase UUIDs",
      (document: WorktodoBackupDocument) => ({
        ...document,
        projects: [
          { ...document.projects[0], id: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA" },
          ...document.projects.slice(1),
        ],
      }),
    ],
    [
      "untrimmed names",
      (document: WorktodoBackupDocument) => ({
        ...document,
        projects: [{ ...document.projects[0], name: " Personal " }, ...document.projects.slice(1)],
      }),
    ],
    [
      "unsafe positions",
      (document: WorktodoBackupDocument) => ({
        ...document,
        tasks: [{ ...document.tasks[0], position: Number.MAX_SAFE_INTEGER + 1 }, ...document.tasks.slice(1)],
      }),
    ],
    [
      "invalid lifecycle timestamps",
      (document: WorktodoBackupDocument) => ({
        ...document,
        tasks: [{ ...document.tasks[0], completedAtMs: 99 }, ...document.tasks.slice(1)],
      }),
    ],
    [
      "unrepresentable due instants",
      (document: WorktodoBackupDocument) => ({
        ...document,
        tasks: [
          {
            ...document.tasks[0],
            due: { kind: "timed", instantMs: MAX_REPRESENTABLE_TIMESTAMP_MS + 1, timeZone: "UTC" },
          },
          ...document.tasks.slice(1),
        ],
      }),
    ],
    [
      "unrepresentable entity timestamps",
      (document: WorktodoBackupDocument) => ({
        ...document,
        projects: [
          { ...document.projects[0], updatedAtMs: MAX_REPRESENTABLE_TIMESTAMP_MS + 1 },
          ...document.projects.slice(1),
        ],
      }),
    ],
    [
      "invalid calendar dates",
      (document: WorktodoBackupDocument) => ({
        ...document,
        tasks: [{ ...document.tasks[0], due: { kind: "allDay", date: "2026-02-30" } }, ...document.tasks.slice(1)],
      }),
    ],
    [
      "non-canonical timezones",
      (document: WorktodoBackupDocument) => ({
        ...document,
        tasks: [{ ...document.tasks[0], due: { kind: "timed", instantMs: 1, timeZone: "US/Eastern" } }],
      }),
    ],
  ])("rejects %s", (_label, mutate) => {
    expectCode(() => parseBackupDocument(mutate(completeDocument())), "INVALID_MODEL");
  });

  it("rejects duplicate IDs within an entity collection", () => {
    const document = completeDocument();
    expectCode(
      () => parseBackupDocument({ ...document, tasks: [...document.tasks, { ...document.tasks[0] }] }),
      "DUPLICATE_ID",
    );
  });

  it.each([
    [
      "a missing task project",
      (document: WorktodoBackupDocument) => ({
        ...document,
        tasks: [{ ...document.tasks[0], projectId: id(999) }, ...document.tasks.slice(1)],
      }),
    ],
    [
      "a missing task label",
      (document: WorktodoBackupDocument) => ({
        ...document,
        tasks: [{ ...document.tasks[0], labelIds: [id(999)] }, ...document.tasks.slice(1)],
      }),
    ],
  ])("rejects %s", (_label, mutate) => {
    expectCode(() => parseBackupDocument(mutate(completeDocument())), "BROKEN_RELATIONSHIP");
  });

  it("converts version 1 sections, collisions, empty sections, ordering, and lifecycle values", () => {
    const legacy = {
      format: "worktodo-backup",
      version: 1,
      exportedAtMs: 9_000,
      projects: completeDocument().projects,
      sections: [
        { id: id(10), projectId: id(1), name: "Waiting", position: 2, createdAtMs: 10, updatedAtMs: 10 },
        { id: id(11), projectId: id(1), name: "Empty", position: 3, createdAtMs: 11, updatedAtMs: 11 },
        { id: id(12), projectId: id(2), name: "ＷＡＩＴＩＮＧ", position: 1, createdAtMs: 12, updatedAtMs: 12 },
      ],
      tasks: [
        { ...completeDocument().tasks[0], id: id(20), priority: "high", projectId: id(1), sectionId: null },
        { ...completeDocument().tasks[1], id: id(21), priority: "medium", projectId: id(1), sectionId: id(10) },
        { ...completeDocument().tasks[2], id: id(22), priority: "low", projectId: id(2), sectionId: id(12) },
      ].map(version1Task),
    };

    const converted = parseBackupDocument(legacy);
    expect(converted.version).toBe(3);
    expect(converted.labels).toEqual([
      expect.objectContaining({ id: id(10), name: "Waiting", position: 1_024 }),
      expect.objectContaining({ id: id(11), name: "Empty", position: 2_048 }),
    ]);
    expect(converted.tasks.find((task) => task.id === id(20))).toMatchObject({
      priority: true,
      position: 1_024,
      labelIds: [],
    });
    expect(converted.tasks.find((task) => task.id === id(21))).toMatchObject({
      position: 2_048,
      priority: false,
      labelIds: [id(10)],
      completedAtMs: 200,
    });
    expect(converted.tasks.find((task) => task.id === id(22))).toMatchObject({
      position: 1_024,
      priority: false,
      labelIds: [id(10)],
      trashedAtMs: 300,
    });
  });

  it("converts version 2 priority levels with only high enabled", () => {
    const document = completeDocument();
    const priorities = ["high", "medium", "low", "none"];
    const converted = parseBackupDocument({
      ...document,
      version: 2,
      tasks: document.tasks.map((task, index) => ({ ...task, priority: priorities[index] })),
    });

    expect(converted.version).toBe(3);
    expect(converted.tasks.map((task) => task.priority)).toEqual([true, false, false, false]);
  });

  it("rejects duplicate normalized label names and duplicate task assignments", () => {
    const document = completeDocument();
    expectCode(
      () =>
        parseBackupDocument({
          ...document,
          labels: [...document.labels, { ...document.labels[0], id: id(99), name: "ＬＡＴＥＲ" }],
        }),
      "DUPLICATE_ID",
    );
    expectCode(
      () =>
        parseBackupDocument({
          ...document,
          tasks: [{ ...document.tasks[0], labelIds: [id(3), id(3)] }, ...document.tasks.slice(1)],
        }),
      "DUPLICATE_ID",
    );
  });
});
