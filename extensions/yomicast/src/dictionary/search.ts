import { JMdictWord } from "@scriptin/jmdict-simplified-types";
import { BindParams, Database } from "sql.js";
import { sql } from "../utils";

export function searchKana(db: Database, query: string) {
  return queryEntries(
    db,
    sql`
      SELECT DISTINCT data FROM entries WHERE entry_id IN (
        SELECT entry_id FROM kana_index WHERE kana_text LIKE :query LIMIT 20
      )`,
    { ":query": `${query}%` },
  );
}

export function searchKanji(db: Database, query: string) {
  return queryEntries(
    db,
    sql`
      SELECT DISTINCT data FROM entries WHERE entry_id IN (
        SELECT entry_id FROM kanji_index WHERE kanji_text LIKE :query LIMIT 20
      )`,
    { ":query": `${query}%` },
  );
}

export function searchEnglish(db: Database, query: string) {
  return queryEntries(
    db,
    sql`
      SELECT
        e.data,
        -- Boost (lower rank) for entries with many common forms.
        -- Boost (lower rank) for entries with kanji.
        -- Penalize (higher rank) for non-primary senses.
        MIN(gf.rank - common_forms_count - e.has_kanji + (gf.sense_idx * 0.2)) AS rank
      FROM gloss_fts_index gf
      JOIN entries e ON gf.entry_id = e.entry_id
      WHERE gf.gloss_fts_index MATCH :query
      GROUP BY e.entry_id -- Get one result per dictionary entry
      ORDER BY rank ASC LIMIT 20
    `,
    { ":query": `"${query}"` },
  );
}

function queryEntries(db: Database, sql: string, params?: BindParams) {
  const stmt = db.prepare(sql, params);
  const results: JMdictWord[] = [];
  while (stmt.step()) {
    const result = stmt.getAsObject();
    try {
      const data = JSON.parse(result.data as string) as JMdictWord;
      results.push(data);
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  }
  stmt.free();
  return results;
}
