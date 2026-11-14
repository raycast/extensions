import assert from "node:assert/strict";
import test from "node:test";
import { copyMissingLegacyWorkLogs, type WorkLogMigrationStorage } from "../src/lib/storage-migration";
import type { WorkLog } from "../src/lib/types";

const legacyLog: WorkLog = {
  id: "log-1",
  projectId: "project-1",
  description: "Legacy description",
  startedAt: "2026-09-23T00:00:00.000Z",
  endedAt: "2026-09-23T01:00:00.000Z",
  createdAt: "2026-09-23T01:00:00.000Z",
  updatedAt: "2026-09-23T01:00:00.000Z",
};

function createStorage(initialItems: Record<string, string> = {}): {
  storage: WorkLogMigrationStorage;
  items: Map<string, string>;
} {
  const items = new Map(Object.entries(initialItems));
  return {
    items,
    storage: {
      async getItem(key) {
        return items.get(key);
      },
      async setItem(key, value) {
        items.set(key, value);
      },
    },
  };
}

const getWorkLogKey = (id: string) => `workLog:${id}`;

test("copies a legacy work log when the per-log key is missing", async () => {
  const { storage, items } = createStorage();

  await copyMissingLegacyWorkLogs([legacyLog], storage, getWorkLogKey);

  assert.deepEqual(JSON.parse(items.get(getWorkLogKey(legacyLog.id)) ?? ""), legacyLog);
});

test("keeps a newer per-log value instead of replacing it with legacy data", async () => {
  const newerLog: WorkLog = {
    ...legacyLog,
    description: "Edited description",
    updatedAt: "2026-09-23T02:00:00.000Z",
  };
  const key = getWorkLogKey(legacyLog.id);
  const { storage, items } = createStorage({ [key]: JSON.stringify(newerLog) });

  await copyMissingLegacyWorkLogs([legacyLog], storage, getWorkLogKey);

  assert.deepEqual(JSON.parse(items.get(key) ?? ""), newerLog);
});

test("is idempotent when migration runs more than once", async () => {
  const { storage, items } = createStorage();

  await copyMissingLegacyWorkLogs([legacyLog], storage, getWorkLogKey);
  const firstResult = items.get(getWorkLogKey(legacyLog.id));
  await copyMissingLegacyWorkLogs([legacyLog], storage, getWorkLogKey);

  assert.equal(items.get(getWorkLogKey(legacyLog.id)), firstResult);
});
