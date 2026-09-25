import assert from "node:assert/strict";
import { test } from "node:test";
import { DailyLog } from "../src/domain/dailyLog/DailyLog";
import { JsonDailyLogRepository } from "../src/infrastructure/dailyLog/JsonDailyLogRepository";
import { DataStorage } from "../src/infrastructure/shared/DataStorage";
import { toDateKey } from "../src/shared/dates";

class MemoryStorage implements DataStorage {
  files = new Map<string, string>();
  save(data: string, date: Date) {
    this.files.set(toDateKey(date), data);
  }
  dataForDateExists(date: Date) {
    return this.files.has(toDateKey(date));
  }
  readForDate(date: Date) {
    return this.files.get(toDateKey(date)) ?? "";
  }
  deleteAllDataForDate(date: Date) {
    this.files.delete(toDateKey(date));
  }
  describeLocation(date: Date) {
    return `${toDateKey(date)}.json`;
  }
}

const monday = new Date(2026, 8, 21, 10, 0);
const tuesday = new Date(2026, 8, 22, 11, 0);

test("moving a log to another day", () => {
  const storage = new MemoryStorage();
  const repository = new JsonDailyLogRepository(storage);
  const log = repository.create({ title: "Wrote tests", date: monday });

  repository.update(log, new DailyLog(log.id, tuesday, "Wrote tests"));

  assert.equal(repository.getAllForDate(monday).length, 0);
  assert.deepEqual(
    repository.getAllForDate(tuesday).map((item) => item.title),
    ["Wrote tests"],
  );
});

test("a failed move keeps the original log", () => {
  const storage = new MemoryStorage();
  const repository = new JsonDailyLogRepository(storage);
  const log = repository.create({ title: "Wrote tests", date: monday });
  storage.save("{ not json", tuesday);

  assert.throws(() => repository.update(log, new DailyLog(log.id, tuesday, "Wrote tests")));
  assert.deepEqual(
    repository.getAllForDate(monday).map((item) => item.id),
    [log.id],
  );
});

test("a move that cannot clean up the old day is rolled back", () => {
  const storage = new MemoryStorage();
  const repository = new JsonDailyLogRepository(storage);
  const log = repository.create({ title: "Wrote tests", date: monday });
  repository.create({ title: "Planned the week", date: tuesday });
  storage.save("{ not json", monday);

  assert.throws(() => repository.update(log, new DailyLog(log.id, tuesday, "Wrote tests")));
  assert.deepEqual(
    repository.getAllForDate(tuesday).map((item) => item.title),
    ["Planned the week"],
  );
  assert.equal(storage.readForDate(monday), "{ not json");
});
