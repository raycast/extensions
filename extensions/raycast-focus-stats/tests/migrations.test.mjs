import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";

test("upgrades stable Drizzle history without replaying migrations or losing sessions", () => {
  const directory = mkdtempSync(join(tmpdir(), "focus-stats-upgrade-"));
  const client = new DatabaseSync(join(directory, "sessions.db"));
  try {
    client.exec(readFileSync(new URL("./fixtures/drizzle-0.43.1.sql", import.meta.url), "utf8"));
    const sessions = client.prepare("SELECT * FROM sessions ORDER BY id");
    const history = client.prepare("SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at");
    const originalSessions = sessions.all();
    const originalHistory = history.all();
    const database = drizzle({ client });
    const migrationsFolder = fileURLToPath(new URL("../assets/drizzle", import.meta.url));

    for (let run = 0; run < 2; run++) {
      migrate(database, { migrationsFolder });
      assert.deepEqual(sessions.all(), originalSessions);
      assert.deepEqual(history.all(), originalHistory);
      assert.deepEqual(
        client
          .prepare("SELECT name FROM __drizzle_migrations ORDER BY created_at")
          .all()
          .map((row) => row.name),
        ["20250517221250_outgoing_golden_guardian", "20250718131631_big_meteorite"],
      );
    }

    const indexes = client.prepare("PRAGMA index_list(sessions)").all();
    for (const name of ["sessions_timestamp_unique", "sessions_goal_timestamp_unique"]) {
      assert.equal(indexes.find((index) => index.name === name)?.unique, 1);
    }
    const insert = client.prepare("INSERT INTO sessions (goal, duration, timestamp) VALUES (?, ?, ?)");
    assert.throws(() => insert.run("Duplicate", 99, originalSessions[0].timestamp), /UNIQUE constraint failed/);
    insert.run("After upgrade", 10, 1793098800000);
    assert.deepEqual(sessions.all().slice(0, 3), originalSessions);
    assert.equal(sessions.all().length, 4);
    assert.equal(client.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  } finally {
    client.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
