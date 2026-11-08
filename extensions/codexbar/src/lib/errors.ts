import { CliNotFoundError } from "./cli";
import { NoUsageDataError } from "./usage";

export function isAppMissing(error: unknown): boolean {
  return error instanceof CliNotFoundError || (error instanceof NoUsageDataError && !error.appInstalled);
}

export function isSnapshotMissing(error: unknown): boolean {
  return error instanceof NoUsageDataError && error.appInstalled;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
