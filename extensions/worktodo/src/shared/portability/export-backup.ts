import type { TaskRepository } from "../domain/repository";
import type { WorktodoBackupDocument, WorktodoSnapshot } from "./backup-contract";

export type ExportBackupResult = {
  document: WorktodoBackupDocument;
  path: string;
};

export function backupFilename(exportedAtMs: number): string {
  const date = new Date(exportedAtMs);
  if (!Number.isSafeInteger(exportedAtMs) || exportedAtMs < 0 || Number.isNaN(date.getTime())) {
    throw new Error("Backup timestamp must be a valid non-negative safe integer");
  }
  return `worktodo-backup-${date.toISOString().replace(/[-:.]/g, "")}.json`;
}

export function readSnapshot(repository: TaskRepository): WorktodoSnapshot {
  return {
    projects: repository.listProjects(),
    labels: repository.listLabels(),
    tasks: repository.listTasks(),
  };
}
