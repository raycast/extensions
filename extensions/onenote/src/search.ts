import { readdir } from "fs/promises";
import { resolve } from "path";

// Bump when the merged database layout or search normalization changes so existing databases are rebuilt.
export const DATABASE_SCHEMA_VERSION = 6;

// Terms shorter than this cannot be looked up in a trigram index.
const MIN_INDEXED_TERM_LENGTH = 3;

// SQLite's lower() only folds ASCII in some builds, so text is normalized in JavaScript instead.
export function normalizeSearchText(text: string) {
  return text.normalize("NFC").toLowerCase();
}

function sqlLiteral(text: string) {
  return `'${text.replaceAll("'", "''")}'`;
}

// Built by SQLite itself after the merged database is saved, because sql.js has no FTS5. The trigram tokenizer
// makes MATCH an indexed substring search, and the external-content table reuses Entities.SearchText.
export const BUILD_FULL_TEXT_INDEX_SQL = `BEGIN;
DROP TABLE IF EXISTS EntitiesFts;
CREATE VIRTUAL TABLE EntitiesFts USING fts5(SearchText, content='Entities', content_rowid='rowid', tokenize='trigram');
INSERT INTO EntitiesFts (rowid, SearchText) SELECT rowid, SearchText FROM Entities;
COMMIT;`;

// SearchText holds each note's normalized title and content. Terms of 3+ characters use the trigram index
// when it exists (anywhere-in-word substring match); shorter terms, or a missing index, fall back to a scan.
export function searchCondition(searchText: string, fullTextIndexed = false) {
  const terms = normalizeSearchText(searchText).trim().split(/\s+/).filter(Boolean);
  return terms
    .map((term) => {
      if (fullTextIndexed && [...term].length >= MIN_INDEXED_TERM_LENGTH) {
        const phrase = `"${term.replaceAll('"', '""')}"`;
        return `AND rowid IN (SELECT rowid FROM EntitiesFts WHERE EntitiesFts MATCH ${sqlLiteral(phrase)})`;
      }
      return `AND instr(SearchText, ${sqlLiteral(term)}) > 0`;
    })
    .join(" ");
}

// Keeps one row per GOID: the most recently modified, with the highest rowid (the newest index) winning ties.
export const DEDUPE_ENTITIES_SQL = `DELETE FROM Entities WHERE rowid NOT IN (
  SELECT (SELECT E2.rowid FROM Entities AS E2 WHERE E2.GOID = G.GOID
          ORDER BY E2.LastModifiedTime DESC, E2.rowid DESC LIMIT 1)
  FROM (SELECT DISTINCT GOID FROM Entities) AS G)`;

export interface IndexFile {
  path: string;
  mtimeMs: number;
}

// Identifies exactly which index files were merged, so added, removed, or changed indexes all trigger a rebuild.
export function indexSignature(files: IndexFile[]) {
  const entries = files.map((file) => `${file.path}:${file.mtimeMs}`).sort();
  return [`v${DATABASE_SCHEMA_VERSION}`, ...entries].join("\n");
}

async function directories(path: string) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function findSearchIndexes(home: string): Promise<string[]> {
  const containersPath = resolve(home, "Library/Containers");
  const containers = await directories(containersPath);
  const candidates = new Set(["com.microsoft.onenote.mac"]);
  for (const container of containers) {
    if (container.isDirectory() && /^[0-9a-f-]{36}$/i.test(container.name)) candidates.add(container.name);
  }
  const indexes: string[] = [];
  for (const container of candidates) {
    const oneNotePath = resolve(
      containersPath,
      container,
      "Data/Library/Application Support/Microsoft User Data/OneNote"
    );
    for (const version of await directories(oneNotePath)) {
      if (!version.isDirectory()) continue;
      const indexPath = resolve(oneNotePath, version.name, "FullTextSearchIndex");
      if ((await directories(indexPath)).some((file) => file.isFile() && file.name.endsWith(".db"))) {
        indexes.push(indexPath);
      }
    }
  }
  if (indexes.length === 0) {
    throw new Error(
      "OneNote's local search index was not found. Install and open OneNote, sign in, and sync your notebooks, then retry."
    );
  }
  return indexes;
}
