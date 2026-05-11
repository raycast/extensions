import { buildNumberResults } from "./number";
import { buildStorageResults, canParseStorage } from "./storage";
import type { NumbrResult } from "./types";

export function buildResults(input: string): NumbrResult[] {
  const query = input.trim();

  if (!query) return [];

  if (canParseStorage(query)) {
    return buildStorageResults(query);
  }

  return buildNumberResults(query);
}
