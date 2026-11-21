import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import {
  migrateLogsToLocalDates,
  MIGRATION_MARKER_FILE,
} from "../src/infrastructure/migrations/migrateLogsToLocalDates";
import { toDateKey } from "../src/shared/dates";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "my-daily-log-"));
}

function readDay(dir: string, key: string) {
  return JSON.parse(fs.readFileSync(path.join(dir, `${key}.json`), "utf8"));
}

test("moves logs stored under their UTC date to their local date and keeps a backup", () => {
  const dir = tempDir();
  const evening = new Date(2024, 3, 16, 23, 45);
  const morning = new Date(2024, 3, 17, 8, 0);
  // Simulate the old behaviour: files named after the UTC date.
  const files = new Map<string, unknown[]>();
  for (const [id, date] of [
    ["a", evening],
    ["b", morning],
  ] as const) {
    const key = date.toISOString().slice(0, 10);
    files.set(key, [...(files.get(key) ?? []), { id, date: date.toISOString(), title: `log ${id}` }]);
  }
  files.forEach((logs, key) => fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(logs)));

  const result = migrateLogsToLocalDates(dir);
  assert.equal(result.migrated, true);
  assert.ok(result.backupPath && fs.existsSync(result.backupPath));

  assert.deepEqual(
    readDay(dir, toDateKey(evening)).map((log: { id: string }) => log.id),
    ["a"],
  );
  assert.deepEqual(
    readDay(dir, toDateKey(morning)).map((log: { id: string }) => log.id),
    ["b"],
  );
  const dayFiles = fs.readdirSync(dir).filter((file) => file.endsWith(".json") && file !== MIGRATION_MARKER_FILE);
  assert.deepEqual(dayFiles.sort(), [`${toDateKey(evening)}.json`, `${toDateKey(morning)}.json`].sort());

  // Runs only once.
  assert.equal(migrateLogsToLocalDates(dir).migrated, false);
});

test("imports legacy markdown logs", () => {
  const dir = tempDir();
  const date = new Date(2023, 0, 10, 9, 1, 5);
  const utcKey = date.toISOString().slice(0, 10);
  fs.writeFileSync(path.join(dir, `${utcKey}.md`), `${utcKey} 9:1:5: Wrote: the migration\n`);

  migrateLogsToLocalDates(dir);

  const logs = readDay(dir, toDateKey(date));
  assert.equal(logs.length, 1);
  assert.equal(logs[0].title, "Wrote: the migration");
  assert.equal(new Date(logs[0].date).getTime(), date.getTime());
  assert.equal(fs.existsSync(path.join(dir, `${utcKey}.md`)), false);
});

test("does not touch anything when a log file is invalid", () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, "2024-01-01.json"), "{ not json");
  assert.throws(() => migrateLogsToLocalDates(dir), /2024-01-01\.json/);
  assert.equal(fs.readFileSync(path.join(dir, "2024-01-01.json"), "utf8"), "{ not json");
  assert.equal(fs.existsSync(path.join(dir, MIGRATION_MARKER_FILE)), false);
});

test("does nothing when the folder does not exist", () => {
  assert.equal(migrateLogsToLocalDates(path.join(tempDir(), "missing")).migrated, false);
});
