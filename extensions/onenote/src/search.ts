import { readdir } from "fs/promises";
import { resolve } from "path";

// Bump when the merged database layout or search normalization changes so existing databases are rebuilt.
export const DATABASE_SCHEMA_VERSION = 3;

// SQLite's lower() only folds ASCII in some builds, so text is normalized in JavaScript instead.
export function normalizeSearchText(text: string) {
  return text.normalize("NFC").toLowerCase();
}

// Splits text into the lowercase words stored in the SearchWords index.
export function tokenizeSearchText(text: string) {
  return normalizeSearchText(text)
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
}

function sqlLiteral(text: string) {
  return `'${text.replaceAll("'", "''")}'`;
}

// Content is searched through the SearchWords index (words starting with each typed word) and titles by substring,
// so a search never scans the full text of every note.
export function searchCondition(searchText: string) {
  const terms = normalizeSearchText(searchText).trim().split(/\s+/).filter(Boolean);
  return terms
    .map((term) => {
      const inTitle = `instr(TitleSearch, ${sqlLiteral(term)}) > 0`;
      const inContent = tokenizeSearchText(term).map(
        (word) =>
          `rowid IN (SELECT EntityRowId FROM SearchWords WHERE word >= ${sqlLiteral(word)} AND word < ${sqlLiteral(
            word
          )} || char(1114111))`
      );
      return inContent.length === 0 ? `AND ${inTitle}` : `AND (${inTitle} OR (${inContent.join(" AND ")}))`;
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
