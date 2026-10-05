/**
 * Shared type definitions for file operations and rename results.
 */

import { ErrorCode } from "./enums";

export { ErrorCode };

export interface FileInfo {
  readonly path: string;
  readonly name: string;
  readonly baseName: string;
  readonly extension: string;
  readonly isDirectory: boolean;
  readonly size?: number;
  readonly modified?: Date;
}

export interface RenameResult {
  readonly oldPath: string;
  readonly newPath: string;
  readonly success: boolean;
  readonly error?: string;
}

export interface RenameOperation {
  readonly oldPath: string;
  readonly newName: string;
  readonly newPath: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Absent status means the rename is still in effect (shown as "Renamed"). */
export type HistoryOperationStatus = "undone" | "undo-failed";

export interface HistoryOperation {
  readonly oldPath: string;
  readonly newPath: string;
  /**
   * Filesystem identity (`dev:ino`) of the renamed file, captured when the
   * operation was recorded. Undo compares it against whatever currently sits
   * at `newPath`, so a different file created there later is never moved.
   * Absent on entries recorded before this field existed.
   */
  readonly fileId?: string;
  readonly status?: HistoryOperationStatus;
  readonly undoError?: string;
}

export interface RenameHistoryEntry {
  readonly timestamp: number;
  readonly description: string;
  readonly operations: ReadonlyArray<HistoryOperation>;
}
