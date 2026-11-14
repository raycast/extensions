import { NoUsageDataError } from "./profiles";

export function isAppMissing(error: unknown): boolean {
  return error instanceof NoUsageDataError && !error.appInstalled;
}

export function isDataMissing(error: unknown): boolean {
  return error instanceof NoUsageDataError && error.appInstalled;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
