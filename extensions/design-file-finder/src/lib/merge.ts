import { FileRecord } from "./types";

/** Keep the first record per absolute path; preserves input order. */
export function dedupe(records: FileRecord[]): FileRecord[] {
  const seen = new Map<string, FileRecord>();
  for (const r of records) {
    if (!seen.has(r.path)) seen.set(r.path, r);
  }
  return [...seen.values()];
}
