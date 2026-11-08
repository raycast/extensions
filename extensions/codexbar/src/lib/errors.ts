import { CliNotFoundError } from "./cli";
import { SnapshotNotFoundError } from "./snapshot";

export function isAppMissing(error: unknown): boolean {
  return error instanceof CliNotFoundError;
}

export function isSnapshotMissing(error: unknown): boolean {
  return error instanceof SnapshotNotFoundError;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
