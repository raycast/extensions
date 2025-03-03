import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { searchEngines } from "./search-engines";
import fs from "fs";
import path from "path";

export const DB_DIR = "./assets";
export const DB_PATH = path.join(DB_DIR, "search-router.db");
async function initializeDatabase() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS search_engines (
      t TEXT PRIMARY KEY,
      s TEXT NOT NULL,
      u TEXT NOT NULL,
      c TEXT,
      d TEXT,
      r INTEGER,
      sc TEXT
    )
  `);

  const count = await db.get("SELECT COUNT(*) as count FROM search_engines");

  if (count.count === 0) {
    console.log("Populating database with searchEngines data...");

    await db.exec("BEGIN TRANSACTION");

    const stmt = await db.prepare(`
      INSERT INTO search_engines (t, s, u, c, d, r, sc)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const searchEngine of searchEngines) {
      await stmt.run(
        searchEngine.t,
        searchEngine.s,
        searchEngine.u,
        searchEngine.c || null,
        searchEngine.d || null,
        searchEngine.r || 0,
        searchEngine.sc || null,
      );
    }

    await stmt.finalize();
    await db.exec("COMMIT");

    console.log(`Inserted ${searchEngines.length} searchEngines into the database.`);
  } else {
    console.log(`Database contains ${count.count} searchEngines. Checking for updates...`);

    await db.exec("BEGIN TRANSACTION");

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    const stmt = await db.prepare(`
      INSERT INTO search_engines (t, s, u, c, d, r, sc)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(t) DO UPDATE SET
        s = excluded.s,
        u = excluded.u,
        c = excluded.c,
        d = excluded.d,
        r = excluded.r,
        sc = excluded.sc
    `);

    const processedSearchEngines = new Set();

    for (const searchEngine of searchEngines) {
      if (processedSearchEngines.has(searchEngine.t)) {
        throw new Error(`Error: Duplicate search engine trigger '${searchEngine.t}' found`);
      }

      processedSearchEngines.add(searchEngine.t);

      const existing = await db.get("SELECT * FROM search_engines WHERE t = ?", searchEngine.t);

      if (!existing) {
        inserted++;
      } else if (
        existing.s !== searchEngine.s ||
        existing.u !== searchEngine.u ||
        existing.c !== (searchEngine.c || null) ||
        existing.d !== (searchEngine.d || null) ||
        existing.r !== (searchEngine.r || 0) ||
        existing.sc !== (searchEngine.sc || null)
      ) {
        updated++;
      } else {
        unchanged++;
      }

      await stmt.run(
        searchEngine.t,
        searchEngine.s,
        searchEngine.u,
        searchEngine.c || null,
        searchEngine.d || null,
        searchEngine.r || 0,
        searchEngine.sc || null,
      );
    }

    await stmt.finalize();

    const dbSearchEngines = await db.all("SELECT t FROM search_engines");
    const searchEngineKeys = new Set(searchEngines.map((b) => b.t));
    const toDelete = dbSearchEngines.filter((b) => !searchEngineKeys.has(b.t));

    let deleted = 0;
    if (toDelete.length > 0) {
      const deleteStmt = await db.prepare("DELETE FROM search_engines WHERE t = ?");
      for (const searchEngine of toDelete) {
        await deleteStmt.run(searchEngine.t);
        deleted++;
      }
      await deleteStmt.finalize();
    }

    await db.exec("COMMIT");

    console.log(
      `Database update complete: ${inserted} inserted, ${updated} updated, ${unchanged} unchanged, ${deleted} deleted.`,
    );
  }

  await db.close();
  return true;
}

initializeDatabase();
