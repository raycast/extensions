import { strict as assert } from "node:assert";
import { test } from "node:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { enrichCodexTitles, readCodexDesktopSessions } from "../src/core/codex-desktop";
import { exec } from "../src/core/sqlite";
import { tempDir } from "./helpers";

test("Codex catalog detects columns and prefers display names over the original prompt", async (t) => {
  const root = tempDir(t);
  await exec(
    join(root, "state_42.sqlite"),
    `CREATE TABLE threads (id TEXT, name TEXT, title TEXT, cwd TEXT, rollout_path TEXT, created_at_ms INTEGER, updated_at_ms INTEGER, archived INTEGER);
    INSERT INTO threads VALUES ('one','Renamed','Original prompt','/project','/transcript',1001,2002,0), ('two','','Fallback title','/project','',1,2,0), ('archived','Old','', '', '',1,2,1);`,
  );
  const rows = await readCodexDesktopSessions({ root });
  assert.deepEqual(
    rows.map((r) => [r.sessionId, r.title]),
    [
      ["one", "Renamed"],
      ["two", "Fallback title"],
    ],
  );
  assert.equal(rows[0].startedAt, 1001);
  assert.equal(rows[0].updatedAt, 2002);
  assert.equal(rows[0].transcriptPath, "/transcript");
  const cli = { ...rows[0], host: "cli" as const, title: "Old prompt" };
  const [renamed] = enrichCodexTitles([cli], rows);
  assert.equal(renamed.title, "Renamed");
  assert.equal(renamed.host, "cli", "a catalog name alone does not establish the currently open app");
});

test("older Codex catalogs need no fixed filename version or new columns; valid empty catalogs stay empty", async (t) => {
  const root = tempDir(t);
  await exec(
    join(root, "state_2.sqlite"),
    `CREATE TABLE threads (id TEXT, title TEXT, created_at INTEGER, updated_at INTEGER);
    INSERT INTO threads VALUES ('one','Old schema',10,20);`,
  );
  const [row] = await readCodexDesktopSessions({ root });
  assert.equal(row.title, "Old schema");
  assert.equal(row.startedAt, 10000);
  await exec(join(root, "state_10.sqlite"), "CREATE TABLE threads (id TEXT, title TEXT);");
  assert.deepEqual(await readCodexDesktopSessions({ root }), []);
});

test("unsupported Codex catalogs fall back to the last index name and tolerate incomplete writes", async (t) => {
  const root = tempDir(t);
  await exec(join(root, "state_99.sqlite"), "CREATE TABLE unrelated (id TEXT);");
  writeFileSync(
    join(root, "session_index.jsonl"),
    [
      JSON.stringify({ id: "one", thread_name: "Old" }),
      JSON.stringify({ id: "one", thread_name: "New", updated_at: "2026-11-04T00:00:00Z" }),
      '{"id":',
    ].join("\n"),
  );
  const rows = await readCodexDesktopSessions({ root });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "New");
  assert.deepEqual(await readCodexDesktopSessions({ root: join(root, "missing") }), []);
});
