import {
  createBackupDocument,
  parseBackupDocument,
  PortabilityError,
  serializeBackupDocument,
  type WorktodoBackupDocument,
} from "./backup-contract";
import { ensurePrivateDirectory, publishBackupFile } from "./backup-file";
import { backupFilename, readSnapshot, type ExportBackupResult } from "./export-backup";
import {
  buildImportPreview,
  countSnapshot,
  readBackupFile,
  snapshotFingerprint,
  type PreparedImport,
} from "./import-preview";
import { ImportReplacementError, type ReplaceableTaskRepository, type ReplacementResult } from "./replace-backup";

export type { ExportBackupResult } from "./export-backup";
export type { PreparedImport } from "./import-preview";
export type { ReplacementResult } from "./replace-backup";

function unchangedError(error: unknown): PortabilityError {
  if (error instanceof PortabilityError) {
    return new PortabilityError(error.code, `${error.message} Worktodo data was not changed.`, error);
  }
  return new PortabilityError(
    "INVALID_IMPORT_FILE",
    "Worktodo could not prepare this import. Worktodo data was not changed.",
    error,
  );
}

function replaceRows(repository: ReplaceableTaskRepository, document: WorktodoBackupDocument): void {
  repository.deleteAllTasks();
  repository.deleteAllLabels();
  repository.deleteAllProjects();
  document.projects.forEach((project) => repository.insertProject(project));
  document.labels.forEach((label) => repository.insertLabel(label));
  document.tasks.forEach((task) => repository.insertTask(task));
}

function assertExactReplacement(repository: ReplaceableTaskRepository, document: WorktodoBackupDocument): void {
  repository.assertIntegrity();
  const stored = createBackupDocument(document.exportedAtMs, readSnapshot(repository));
  if (serializeBackupDocument(stored) !== serializeBackupDocument(document)) {
    throw new Error("The replacement database does not match the selected backup");
  }
}

export class PortabilityService {
  constructor(
    private readonly repository: ReplaceableTaskRepository,
    private readonly recoveryDirectory: string,
    private readonly now: () => number,
  ) {}

  exportTo(directory: string): ExportBackupResult {
    const exportedAtMs = this.now();
    const document = this.repository.transaction(() =>
      createBackupDocument(exportedAtMs, readSnapshot(this.repository)),
    );
    const path = publishBackupFile(directory, backupFilename(exportedAtMs), serializeBackupDocument(document));
    return { document, path };
  }

  prepare(path: string): PreparedImport {
    try {
      const document = readBackupFile(path);
      const current = this.repository.transaction(() => readSnapshot(this.repository));
      return {
        path,
        document,
        preview: buildImportPreview(document, current),
        currentFingerprint: snapshotFingerprint(current),
      };
    } catch (error) {
      throw unchangedError(error);
    }
  }

  replace(prepared: PreparedImport): ReplacementResult {
    const replacementAtMs = this.now();
    const document = parseBackupDocument(prepared.document);
    let recoveryPath: string | undefined;

    try {
      return this.repository.transaction(() => {
        const currentSnapshot = readSnapshot(this.repository);
        if (snapshotFingerprint(currentSnapshot) !== prepared.currentFingerprint) {
          throw new PortabilityError("STALE_PREVIEW", "Worktodo changed since this preview. Preview the backup again.");
        }
        const current = createBackupDocument(replacementAtMs, currentSnapshot);
        ensurePrivateDirectory(this.recoveryDirectory);
        recoveryPath = publishBackupFile(
          this.recoveryDirectory,
          backupFilename(replacementAtMs),
          serializeBackupDocument(current),
        );
        replaceRows(this.repository, document);
        assertExactReplacement(this.repository, document);
        return { recoveryPath, replaced: countSnapshot(document) };
      });
    } catch (error) {
      if (error instanceof PortabilityError && error.code === "STALE_PREVIEW") {
        throw error;
      }
      throw new ImportReplacementError(error, recoveryPath);
    }
  }
}
