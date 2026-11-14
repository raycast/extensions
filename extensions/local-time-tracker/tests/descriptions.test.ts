import assert from "node:assert/strict";
import test from "node:test";
import { getRecentDescriptions } from "../src/lib/descriptions";
import type { WorkLog } from "../src/lib/types";

function log(id: string, projectId: string, description: string, startedAt: string): WorkLog {
  return {
    id,
    projectId,
    description,
    startedAt,
    endedAt: new Date(new Date(startedAt).getTime() + 60_000).toISOString(),
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

test("returns recent non-empty descriptions for the selected project", () => {
  const descriptions = getRecentDescriptions(
    [
      log("1", "project-a", "Older task", "2026-09-20T00:00:00.000Z"),
      log("2", "project-b", "Other project", "2026-09-23T00:00:00.000Z"),
      log("3", "project-a", "", "2026-09-22T00:00:00.000Z"),
      log("4", "project-a", "Latest task", "2026-09-23T00:00:00.000Z"),
    ],
    "project-a",
  );

  assert.deepEqual(descriptions, ["Latest task", "Older task"]);
});

test("deduplicates descriptions without changing their latest spelling", () => {
  const descriptions = getRecentDescriptions(
    [
      log("1", "project-a", "Review", "2026-09-20T00:00:00.000Z"),
      log("2", "project-a", "review", "2026-09-23T00:00:00.000Z"),
    ],
    "project-a",
  );

  assert.deepEqual(descriptions, ["review"]);
});
