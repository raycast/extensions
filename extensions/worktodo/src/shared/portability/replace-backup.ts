import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import type { TaskRepository } from "../domain/repository";
import { PortabilityError } from "./backup-contract";
import type { BackupCounts } from "./import-preview";

export interface ReplaceableTaskRepository extends TaskRepository {
  deleteAllTasks(): void;
  deleteAllLabels(): void;
  deleteAllProjects(): void;
  assertIntegrity(): void;
}

export type ReplacementResult = {
  recoveryPath: string;
  replaced: BackupCounts;
};

export class ImportReplacementError extends PortabilityError {
  readonly recoveryPath: string | undefined;

  constructor(cause: unknown, recoveryPath?: string) {
    super("IMPORT_FAILED", "Worktodo could not replace its data. Worktodo data was not changed.", cause);
    this.name = "ImportReplacementError";
    this.recoveryPath = recoveryPath;
  }
}

export function resolveRecoveryDirectory(homeDirectory = homedir()): string {
  if (!isAbsolute(homeDirectory)) {
    throw new Error("The Worktodo home directory must be absolute");
  }
  return join(homeDirectory, "Library", "Application Support", "Worktodo", "Backups");
}
