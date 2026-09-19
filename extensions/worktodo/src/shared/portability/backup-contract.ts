import { z } from "zod";
import type { Label, Project, Task } from "../domain/model";
import {
  canonicalizeTimeZone,
  MAX_REPRESENTABLE_TIMESTAMP_MS,
  normalizeLabelName,
  validateCalendarDate,
} from "../domain/validation";

export const WORKTODO_BACKUP_FORMAT = "worktodo-backup";
export const WORKTODO_BACKUP_VERSION = 3;

export type WorktodoSnapshot = {
  projects: Project[];
  labels: Label[];
  tasks: Task[];
};

export type WorktodoBackupDocument = WorktodoSnapshot & {
  format: typeof WORKTODO_BACKUP_FORMAT;
  version: typeof WORKTODO_BACKUP_VERSION;
  exportedAtMs: number;
};

export type PortabilityErrorCode =
  | "BROKEN_RELATIONSHIP"
  | "DESTINATION_EXISTS"
  | "DUPLICATE_ID"
  | "FILE_CHANGED"
  | "FILE_TOO_LARGE"
  | "FILE_WRITE_FAILED"
  | "INVALID_DESTINATION"
  | "INVALID_DOCUMENT"
  | "INVALID_IMPORT_FILE"
  | "INVALID_MODEL"
  | "IMPORT_FAILED"
  | "STALE_PREVIEW"
  | "UNSUPPORTED_VERSION";

export class PortabilityError extends Error {
  readonly code: PortabilityErrorCode;

  constructor(code: PortabilityErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "PortabilityError";
    this.code = code;
  }
}

const uuidV4 = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const nonNegativeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const timestamp = z.number().int().nonnegative().max(MAX_REPRESENTABLE_TIMESTAMP_MS);
const trimmedText = z.string().refine((value) => value.length > 0 && value === value.trim());
const timestampedEntity = {
  createdAtMs: timestamp,
  updatedAtMs: timestamp,
};

const projectSchema = z
  .strictObject({
    id: uuidV4,
    name: trimmedText,
    position: nonNegativeInteger,
    ...timestampedEntity,
  })
  .refine((value) => value.updatedAtMs >= value.createdAtMs);

const labelSchema = z
  .strictObject({
    id: uuidV4,
    name: trimmedText,
    position: nonNegativeInteger,
    ...timestampedEntity,
  })
  .refine((value) => value.updatedAtMs >= value.createdAtMs);

const legacySectionSchema = z
  .strictObject({
    id: uuidV4,
    projectId: uuidV4,
    name: trimmedText,
    position: nonNegativeInteger,
    ...timestampedEntity,
  })
  .refine((value) => value.updatedAtMs >= value.createdAtMs);

const dueSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("none") }),
  z.strictObject({
    kind: z.literal("allDay"),
    date: z.string().refine((value) => {
      try {
        return validateCalendarDate(value) === value;
      } catch {
        return false;
      }
    }),
  }),
  z.strictObject({
    kind: z.literal("timed"),
    instantMs: timestamp,
    timeZone: z.string().refine((value) => {
      try {
        return canonicalizeTimeZone(value) === value;
      } catch {
        return false;
      }
    }),
  }),
]);

const lifecycleFields = {
  ...timestampedEntity,
  completedAtMs: timestamp.nullable(),
  trashedAtMs: timestamp.nullable(),
};

type LifecycleValue = {
  createdAtMs: number;
  updatedAtMs: number;
  completedAtMs: number | null;
  trashedAtMs: number | null;
};

function validLifecycle(value: LifecycleValue): boolean {
  return (
    value.updatedAtMs >= value.createdAtMs &&
    (value.completedAtMs === null ||
      (value.completedAtMs >= value.createdAtMs && value.completedAtMs <= value.updatedAtMs)) &&
    (value.trashedAtMs === null || (value.trashedAtMs >= value.createdAtMs && value.trashedAtMs <= value.updatedAtMs))
  );
}

const taskSchemaBase = z.strictObject({
  id: uuidV4,
  title: trimmedText,
  notes: z.string(),
  priority: z.boolean(),
  position: nonNegativeInteger,
  projectId: uuidV4.nullable(),
  due: dueSchema,
  ...lifecycleFields,
});

const taskSchema = taskSchemaBase.extend({ labelIds: z.array(uuidV4) }).refine(validLifecycle);

const legacyTaskSchemaBase = taskSchemaBase.extend({ priority: z.enum(["none", "low", "medium", "high"]) });

const version2TaskSchema = legacyTaskSchemaBase.extend({ labelIds: z.array(uuidV4) }).refine(validLifecycle);

const version1TaskSchema = legacyTaskSchemaBase
  .extend({ sectionId: uuidV4.nullable() })
  .refine(validLifecycle)
  .refine((value) => value.sectionId === null || value.projectId !== null);

const backupSchema = z.strictObject({
  format: z.literal(WORKTODO_BACKUP_FORMAT),
  version: z.literal(WORKTODO_BACKUP_VERSION),
  exportedAtMs: timestamp,
  projects: z.array(projectSchema),
  labels: z.array(labelSchema),
  tasks: z.array(taskSchema),
});

const version2BackupSchema = z.strictObject({
  format: z.literal(WORKTODO_BACKUP_FORMAT),
  version: z.literal(2),
  exportedAtMs: timestamp,
  projects: z.array(projectSchema),
  labels: z.array(labelSchema),
  tasks: z.array(version2TaskSchema),
});

const version1BackupSchema = z.strictObject({
  format: z.literal(WORKTODO_BACKUP_FORMAT),
  version: z.literal(1),
  exportedAtMs: timestamp,
  projects: z.array(projectSchema),
  sections: z.array(legacySectionSchema),
  tasks: z.array(version1TaskSchema),
});

type Version2BackupDocument = z.infer<typeof version2BackupSchema>;
type Version1BackupDocument = z.infer<typeof version1BackupSchema>;
type Version1Task = z.infer<typeof version1TaskSchema>;

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function rejectUnsupportedVersion(value: unknown): void {
  const candidate = record(value);
  if (
    candidate?.format === WORKTODO_BACKUP_FORMAT &&
    Number.isInteger(candidate.version) &&
    candidate.version !== 1 &&
    candidate.version !== 2 &&
    candidate.version !== WORKTODO_BACKUP_VERSION
  ) {
    throw new PortabilityError(
      "UNSUPPORTED_VERSION",
      `This Worktodo backup uses version ${String(candidate.version)}. This version of Worktodo supports versions 1, 2, and 3.`,
    );
  }
}

function rejectDuplicates(collection: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new PortabilityError("DUPLICATE_ID", `The backup contains a duplicate ${collection} ID.`);
    }
    seen.add(id);
  }
}

function compareOrdered(
  left: Pick<Project, "id" | "position" | "createdAtMs">,
  right: Pick<Project, "id" | "position" | "createdAtMs">,
): number {
  return (
    left.position - right.position ||
    left.createdAtMs - right.createdAtMs ||
    (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
  );
}

function validateRelationships(document: WorktodoBackupDocument): void {
  rejectDuplicates(
    "project",
    document.projects.map((project) => project.id),
  );
  rejectDuplicates(
    "label",
    document.labels.map((label) => label.id),
  );
  rejectDuplicates(
    "task",
    document.tasks.map((task) => task.id),
  );

  const labelNames = new Set<string>();
  for (const label of document.labels) {
    const normalizedName = normalizeLabelName(label.name);
    if (labelNames.has(normalizedName)) {
      throw new PortabilityError("DUPLICATE_ID", "The backup contains duplicate normalized label names.");
    }
    labelNames.add(normalizedName);
  }

  const projects = new Set(document.projects.map((project) => project.id));
  const labels = new Set(document.labels.map((label) => label.id));
  for (const task of document.tasks) {
    if (task.projectId !== null && !projects.has(task.projectId)) {
      throw new PortabilityError("BROKEN_RELATIONSHIP", "A backup task references a missing project.");
    }
    rejectDuplicates("task label", task.labelIds);
    if (task.labelIds.some((labelId) => !labels.has(labelId))) {
      throw new PortabilityError("BROKEN_RELATIONSHIP", "A backup task references a missing label.");
    }
  }
}

function validateVersion1Relationships(document: Version1BackupDocument): void {
  rejectDuplicates(
    "project",
    document.projects.map((project) => project.id),
  );
  rejectDuplicates(
    "section",
    document.sections.map((section) => section.id),
  );
  rejectDuplicates(
    "task",
    document.tasks.map((task) => task.id),
  );
  const projects = new Set(document.projects.map((project) => project.id));
  const sections = new Map(document.sections.map((section) => [section.id, section]));
  for (const section of document.sections) {
    if (!projects.has(section.projectId)) {
      throw new PortabilityError("BROKEN_RELATIONSHIP", "A backup section references a missing project.");
    }
  }
  for (const task of document.tasks) {
    if (task.projectId !== null && !projects.has(task.projectId)) {
      throw new PortabilityError("BROKEN_RELATIONSHIP", "A backup task references a missing project.");
    }
    if (task.sectionId !== null) {
      const section = sections.get(task.sectionId);
      if (!section || section.projectId !== task.projectId) {
        throw new PortabilityError(
          "BROKEN_RELATIONSHIP",
          "A backup task references a missing section or a section in another project.",
        );
      }
    }
  }
}

function convertedVersion1Task(task: Version1Task, position: number, labelIds: string[]): Task {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    priority: task.priority === "high",
    position,
    projectId: task.projectId,
    labelIds,
    due: task.due,
    createdAtMs: task.createdAtMs,
    updatedAtMs: task.updatedAtMs,
    completedAtMs: task.completedAtMs,
    trashedAtMs: task.trashedAtMs,
  };
}

function convertVersion1Document(document: Version1BackupDocument): WorktodoBackupDocument {
  validateVersion1Relationships(document);
  const projects = [...document.projects].sort(compareOrdered);
  const projectRank = new Map(projects.map((project, index) => [project.id, index]));
  const sections = [...document.sections].sort(
    (left, right) =>
      (projectRank.get(left.projectId) ?? Number.MAX_SAFE_INTEGER) -
        (projectRank.get(right.projectId) ?? Number.MAX_SAFE_INTEGER) || compareOrdered(left, right),
  );
  const labels: Label[] = [];
  const labelByName = new Map<string, Label>();
  const labelBySection = new Map<string, string>();
  for (const section of sections) {
    const nameKey = normalizeLabelName(section.name);
    let label = labelByName.get(nameKey);
    if (!label) {
      label = {
        id: section.id,
        name: section.name,
        position: (labels.length + 1) * 1_024,
        createdAtMs: section.createdAtMs,
        updatedAtMs: section.updatedAtMs,
      };
      labels.push(label);
      labelByName.set(nameKey, label);
    }
    labelBySection.set(section.id, label.id);
  }

  const converted = new Map<string, Task>();
  for (const task of document.tasks.filter((candidate) => candidate.projectId === null)) {
    converted.set(task.id, convertedVersion1Task(task, task.position, []));
  }
  for (const project of projects) {
    const direct = document.tasks
      .filter((task) => task.projectId === project.id && task.sectionId === null)
      .sort(compareOrdered);
    const sectionTasks = sections
      .filter((section) => section.projectId === project.id)
      .flatMap((section) =>
        document.tasks
          .filter((task) => task.sectionId === section.id)
          .sort(compareOrdered)
          .map((task) => ({ task, labelId: labelBySection.get(section.id) })),
      );
    [...direct.map((task) => ({ task, labelId: undefined })), ...sectionTasks].forEach(({ task, labelId }, index) => {
      converted.set(task.id, convertedVersion1Task(task, (index + 1) * 1_024, labelId ? [labelId] : []));
    });
  }

  return {
    format: WORKTODO_BACKUP_FORMAT,
    version: WORKTODO_BACKUP_VERSION,
    exportedAtMs: document.exportedAtMs,
    projects: document.projects,
    labels,
    tasks: document.tasks.map((task) => {
      const convertedTask = converted.get(task.id);
      if (!convertedTask) {
        throw new PortabilityError("BROKEN_RELATIONSHIP", "A legacy backup task could not be converted.");
      }
      return convertedTask;
    }),
  };
}

function convertVersion2Document(document: Version2BackupDocument): WorktodoBackupDocument {
  return {
    ...document,
    version: WORKTODO_BACKUP_VERSION,
    tasks: document.tasks.map((task) => ({ ...task, priority: task.priority === "high" })),
  };
}

function compareId(left: { id: string }, right: { id: string }): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function canonicalBackupDocument(document: WorktodoBackupDocument): WorktodoBackupDocument {
  const labelRank = new Map([...document.labels].sort(compareOrdered).map((label, index) => [label.id, index]));
  return {
    ...document,
    projects: [...document.projects].sort(compareId),
    labels: [...document.labels].sort(compareId),
    tasks: [...document.tasks]
      .map((task) => ({
        ...task,
        labelIds: [...task.labelIds].sort(
          (left, right) =>
            (labelRank.get(left) ?? Number.MAX_SAFE_INTEGER) - (labelRank.get(right) ?? Number.MAX_SAFE_INTEGER),
        ),
      }))
      .sort(compareId),
  };
}

function parseVersion3(value: unknown): WorktodoBackupDocument {
  const parsed = backupSchema.safeParse(value);
  if (!parsed.success) {
    throw new PortabilityError("INVALID_MODEL", "This file is not a valid Worktodo backup.", parsed.error);
  }
  const document = parsed.data as WorktodoBackupDocument;
  validateRelationships(document);
  return canonicalBackupDocument(document);
}

export function parseBackupDocument(value: unknown): WorktodoBackupDocument {
  rejectUnsupportedVersion(value);
  const candidate = record(value);
  if (candidate?.format === WORKTODO_BACKUP_FORMAT && candidate.version === 1) {
    const parsed = version1BackupSchema.safeParse(value);
    if (!parsed.success) {
      throw new PortabilityError("INVALID_MODEL", "This file is not a valid Worktodo backup.", parsed.error);
    }
    return parseVersion3(convertVersion1Document(parsed.data));
  }
  if (candidate?.format === WORKTODO_BACKUP_FORMAT && candidate.version === 2) {
    const parsed = version2BackupSchema.safeParse(value);
    if (!parsed.success) {
      throw new PortabilityError("INVALID_MODEL", "This file is not a valid Worktodo backup.", parsed.error);
    }
    return parseVersion3(convertVersion2Document(parsed.data));
  }
  return parseVersion3(value);
}

export function parseBackupJson(value: string): WorktodoBackupDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new PortabilityError("INVALID_DOCUMENT", "This file does not contain valid JSON.", error);
  }
  return parseBackupDocument(parsed);
}

export function createBackupDocument(exportedAtMs: number, snapshot: WorktodoSnapshot): WorktodoBackupDocument {
  return parseVersion3({
    format: WORKTODO_BACKUP_FORMAT,
    version: WORKTODO_BACKUP_VERSION,
    exportedAtMs,
    ...snapshot,
  });
}

export function serializeBackupDocument(document: WorktodoBackupDocument): string {
  return `${JSON.stringify(parseVersion3(document), null, 2)}\n`;
}
