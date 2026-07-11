import { describe, expect, it } from "vitest";
import { capRecordSnapshot, pruneHistory } from "../storage";
import { HistoryEntry } from "../types";

describe("history retention", () => {
  const queryEntry = (id: string, timestamp: string): HistoryEntry => ({
    id,
    kind: "query",
    mode: "soql",
    timestamp,
    orgId: "org-example",
    orgAlias: "Example Sandbox",
    text: "SELECT Id FROM Account",
    rowCount: 0,
    records: [],
    resultTruncated: false,
  });

  it("removes expired entries, sorts newest first, and applies a limit", () => {
    const now = new Date("2026-07-10T12:00:00.000Z");
    const entries = [
      queryEntry("old", "2026-05-01T12:00:00.000Z"),
      queryEntry("newest", "2026-07-10T11:00:00.000Z"),
      queryEntry("middle", "2026-07-09T11:00:00.000Z"),
    ];
    expect(pruneHistory(entries, now, 30, 1).map((entry) => entry.id)).toEqual(["newest"]);
  });

  it("caps snapshots at 500 rows", () => {
    const records = Array.from({ length: 700 }, (_, index) => ({ Id: String(index), Name: `Record ${index}` }));
    const result = capRecordSnapshot(records);
    expect(result.records).toHaveLength(500);
    expect(result.truncated).toBe(true);
  });

  it("caps large serialized snapshots below two megabytes", () => {
    const records = Array.from({ length: 500 }, (_, index) => ({ Id: String(index), Body: "x".repeat(10_000) }));
    const result = capRecordSnapshot(records);
    expect(Buffer.byteLength(JSON.stringify(result.records), "utf8")).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(result.truncated).toBe(true);
  });
});
