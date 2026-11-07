import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { bookQuery, selectPreview, SessionPools, type GeneratedUnit } from "../src/generator.ts";

test("every configured book generates maximum sentence and passage counts from the bundled database", async () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const catalog = manifest.preferences.find((preference: { name: string }) => preference.name === "defaultBook")?.data;
  assert.ok(catalog?.length, "The book preference must contain choices");
  const db = new DatabaseSync(fileURLToPath(new URL("../assets/corpus.db", import.meta.url)), { readOnly: true });
  try {
    for (const { value: bookId } of catalog as { value: string }[]) {
      assert.ok(db.prepare(bookQuery(bookId)).get(), `${bookId}: bundled book metadata is available`);
      for (const [unit, count] of [
        ["sentences", 20],
        ["passages", 10],
      ] as const) {
        const pools = new SessionPools(unit, async (sql) => db.prepare(sql).all() as GeneratedUnit[]);
        const result = await pools.load(bookId);
        assert.equal(result.status, "ready", `${bookId} ${unit}: ${result.status === "error" ? result.message : ""}`);
        if (result.status === "ready") {
          const preview = selectPreview({ unit, count }, result.rows);
          assert.equal(preview.selected.length, count, `${bookId} ${unit}: maximum count`);
          assert.ok(preview.text.trim(), `${bookId} ${unit}: generated text`);
        }
      }
    }
  } finally {
    db.close();
  }
});
