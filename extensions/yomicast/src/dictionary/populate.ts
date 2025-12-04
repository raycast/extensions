import { loadDictionary } from "@scriptin/jmdict-simplified-loader";
import { Database } from "sql.js";
import { EXTRACT_PATH } from "../constants";
import { Toast } from "@raycast/api";
import { normalizeKana, sql } from "../utils";
import { JMdictWord } from "@scriptin/jmdict-simplified-types";

export function createTables(db: Database) {
  return db.run(sql`
    DROP TABLE IF EXISTS metadata;
    DROP TABLE IF EXISTS entries;
    DROP TABLE IF EXISTS kanji_index;
    DROP TABLE IF EXISTS kana_index;
    DROP TABLE IF EXISTS gloss_fts_index;

    CREATE TABLE metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE entries (
      entry_id INTEGER PRIMARY KEY,
      data TEXT NOT NULL,
      common_forms_count INTEGER NOT NULL DEFAULT 0,
      has_kanji BOOLEAN NOT NULL DEFAULT 0
    );

    CREATE TABLE kanji_index (
      kanji_text TEXT NOT NULL,
      entry_id INTEGER NOT NULL,
      PRIMARY KEY (kanji_text, entry_id),
      FOREIGN KEY (entry_id) REFERENCES entries(entry_id) ON DELETE CASCADE
    );
    CREATE INDEX idx_kanji_text_prefix ON kanji_index(kanji_text);

    CREATE TABLE kana_index (
      kana_text TEXT NOT NULL,
      entry_id INTEGER NOT NULL,
      PRIMARY KEY (kana_text, entry_id),
      FOREIGN KEY (entry_id) REFERENCES entries(entry_id) ON DELETE CASCADE
    );
    CREATE INDEX idx_kana_text_prefix ON kana_index(kana_text);

    CREATE VIRTUAL TABLE gloss_fts_index USING fts5(
      entry_id UNINDEXED,
      sense_idx UNINDEXED,
      gloss_content,
      tokenize = 'unicode61'
    );
  `);
}

export function populateTables(db: Database, toast: Toast, abortSignal: AbortSignal) {
  if (abortSignal.aborted) {
    return false;
  }

  console.log("Creating database tables...");
  createTables(db);

  console.log("Populating dictionary...");
  return new Promise<boolean>((resolve) => {
    let count = 0;
    const total = 212062;

    // No need for rollback journal during initial population
    db.run("PRAGMA journal_mode = OFF;");

    // Begin single transaction for all insertions
    db.run("BEGIN TRANSACTION;");
    const entryStmt = db.prepare(
      sql`INSERT INTO entries (entry_id, data, common_forms_count, has_kanji) VALUES (:entry_id, :data, :common_forms_count, :has_kanji);`,
    );
    const kanjiStmt = db.prepare(sql`INSERT INTO kanji_index (kanji_text, entry_id) VALUES (:kanji_text, :entry_id);`);
    const kanaStmt = db.prepare(
      sql`INSERT OR REPLACE INTO kana_index (kana_text, entry_id) VALUES (:kana_text, :entry_id);`,
    );
    const glossFtsStmt = db.prepare(
      sql`INSERT INTO gloss_fts_index (entry_id, sense_idx, gloss_content) VALUES (:entry_id, :sense_idx, :gloss_content);`,
    );

    const loader = loadDictionary("jmdict", EXTRACT_PATH).onMetadata((metadata) => {
      db.run(sql`INSERT INTO metadata (key, value) VALUES ('version', :version), ('date', :date), ('tags', :tags);`, {
        ":version": metadata.version,
        ":date": metadata.dictDate,
        ":tags": JSON.stringify(metadata.tags),
      });
    });
    loader.onEntry((entry) => {
      // Insert full entry data
      entryStmt.run({
        ":entry_id": entry.id,
        ":data": JSON.stringify(entry),
        ":common_forms_count": countCommonForms(entry),
        ":has_kanji": Number(entry.kanji.length > 0),
      });

      // Insert kanji
      entry.kanji.forEach((kanji) => {
        kanjiStmt.run({
          ":kanji_text": kanji.text,
          ":entry_id": entry.id,
        });
      });

      // Insert normalized kana
      entry.kana.forEach((kana) => {
        kanaStmt.run({
          ":kana_text": normalizeKana(kana.text),
          ":entry_id": entry.id,
        });
      });

      // Insert glosses into FTS index
      entry.sense.forEach((sense) => {
        sense.gloss.forEach((gloss, senseIndex) => {
          if (!gloss.text) return;
          glossFtsStmt.run({
            ":entry_id": entry.id,
            ":sense_idx": senseIndex,
            ":gloss_content": gloss.text,
          });
        });
      });

      count += 1;
      if (count % 1000 === 0) {
        toast.title = "Indexing database...";
        toast.message = `Progress: ${Math.round((count / Math.max(total, count)) * 100)}%`;
        toast.style = Toast.Style.Animated;
      }
    });
    loader.onEnd(() => {
      db.run("COMMIT;");
      console.log(`Indexed ${count} entries.`);
      console.log("Dictionary loaded successfully.");
      resolve(true);
    });
    loader.parser.on("error", (error: unknown) => {
      console.error("Failed to parse dictionary:", error);
      resolve(false);
    });
    abortSignal.addEventListener(
      "abort",
      () => {
        console.log("Aborting dictionary indexing...");
        loader.parser.destroy();
        db.close();

        resolve(false);
      },
      { once: true },
    );
  });
}

function countCommonForms(entry: JMdictWord) {
  let count = 0;
  entry.kana.forEach((kana) => {
    if (kana.common) count += 1;
  });
  entry.kanji.forEach((kanji) => {
    if (kanji.common) count += 1;
  });
  return count;
}
