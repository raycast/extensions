import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorage } from "@raycast/api";
import { pruneRunHistory } from "../storage";
import { RunHistoryEntry } from "../types";

function entry(id: string, timestamp: string): RunHistoryEntry {
  return {
    id,
    timestamp,
    jobId: "job-id",
    jobName: "Job",
    environment: "sandbox",
    runRequestId: `request-${id}`,
    state: "Pending",
  };
}

describe("run history retention", () => {
  beforeEach(async () => LocalStorage.clear());

  it("prunes by age and entry limit", () => {
    const now = new Date("2026-07-10T12:00:00.000Z");
    const result = pruneRunHistory(
      [
        entry("newest", "2026-07-10T11:00:00.000Z"),
        entry("middle", "2026-07-09T11:00:00.000Z"),
        entry("old", "2026-06-01T11:00:00.000Z"),
      ],
      now,
      { days: 30, limit: 1 },
    );
    expect(result.map((value) => value.id)).toEqual(["newest"]);
  });
});
