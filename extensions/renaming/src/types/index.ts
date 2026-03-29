/**
 * Shared type definitions for the renaming extension
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
