import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { searchPages, type SavedPage, type SearchResult } from "./docs";

export interface Collection {
  id: string;
  rootUrl: string;
  title: string;
  pageCount: number;
  importedAt: string;
  errors: string[];
  skipped?: string[];
  truncated: boolean;
  snapshot?: string;
  customTitle?: string;
}

export const docsDirectory = () => join(homedir(), ".context", "docs");
const idFor = (rootUrl: string) => createHash("sha256").update(rootUrl).digest("hex").slice(0, 16);
const fileFor = (url: string) => `${createHash("sha256").update(url).digest("hex").slice(0, 20)}.md`;

export async function beginSnapshot(rootUrl: string, baseDir = docsDirectory()) {
  const id = idFor(rootUrl);
  const snapshot = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const collectionDir = join(baseDir, id);
  const snapshotDir = join(collectionDir, "snapshots", snapshot);
  const pagesDir = join(snapshotDir, "pages");
  await mkdir(pagesDir, { recursive: true });
  const db = new DatabaseSync(join(snapshotDir, "index.sqlite"));
  db.exec(`
    CREATE TABLE pages (url TEXT PRIMARY KEY, title TEXT NOT NULL, markdown TEXT NOT NULL, fetchedAt TEXT NOT NULL);
    CREATE VIRTUAL TABLE pages_fts USING fts5(title, markdown, content='pages', content_rowid='rowid');
    CREATE TRIGGER pages_ai AFTER INSERT ON pages BEGIN
      INSERT INTO pages_fts(rowid, title, markdown) VALUES (new.rowid, new.title, new.markdown);
    END;
  `);
  const insert = db.prepare("INSERT OR REPLACE INTO pages (url, title, markdown, fetchedAt) VALUES (?, ?, ?, ?)");
  let count = 0;
  let firstTitle = "";
  return {
    snapshotDir,
    async addPage(page: SavedPage) {
      const name = fileFor(page.url);
      await writeFile(join(pagesDir, name), `# ${page.title}\n\nSource: ${page.url}\nSaved: ${page.fetchedAt}\n\n${page.markdown}\n`, "utf8");
      insert.run(page.url, page.title, page.markdown, page.fetchedAt);
      count++;
      firstTitle ||= page.title;
    },
    async publish(errors: string[], truncated: boolean, skipped: string[] = []): Promise<Collection> {
      if (!count) throw new Error(errors[0] || "No readable documentation pages were found.");
      db.close();
      let previous: Collection | undefined;
      try { previous = JSON.parse(await readFile(join(collectionDir, "current.json"), "utf8")) as Collection; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      const collection: Collection = {
        id, rootUrl, title: previous?.customTitle || firstTitle || new URL(rootUrl).hostname,
        pageCount: count, importedAt: new Date().toISOString(), errors, skipped, truncated, snapshot,
        ...(previous?.customTitle ? { customTitle: previous.customTitle } : {}),
      };
      await writeFile(join(snapshotDir, "manifest.json"), JSON.stringify(collection), "utf8");
      const pending = join(collectionDir, `current-${snapshot}.tmp`);
      await writeFile(pending, JSON.stringify(collection), "utf8");
      await rename(pending, join(collectionDir, "current.json"));
      return collection;
    },
    async abandon(reason: string) {
      if (db.isOpen) db.close();
      await writeFile(join(snapshotDir, "failure.txt"), reason, "utf8");
    },
  };
}

async function currentCollections(baseDir: string): Promise<Collection[]> {
  let ids: string[];
  try { ids = await readdir(baseDir); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const collections: Collection[] = [];
  for (const id of ids.filter((entry) => /^[0-9a-f]{16}$/.test(entry))) {
    try { collections.push(JSON.parse(await readFile(join(baseDir, id, "current.json"), "utf8")) as Collection); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return collections;
}

async function legacyCollections(supportPath?: string): Promise<Collection[]> {
  if (!supportPath) return [];
  const dir = join(supportPath, "collections");
  let names: string[];
  try { names = await readdir(dir); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const collections: Collection[] = [];
  for (const name of names.filter((entry) => /^[0-9a-f]{16}\.json$/.test(entry))) {
    const data = JSON.parse(await readFile(join(dir, name), "utf8")) as { collection: Collection };
    collections.push(data.collection);
  }
  return collections;
}

export async function listCollections(baseDir = docsDirectory(), supportPath?: string): Promise<Collection[]> {
  const current = await currentCollections(baseDir);
  const currentRoots = new Set(current.map((collection) => collection.rootUrl));
  const legacy = (await legacyCollections(supportPath)).filter((collection) => !currentRoots.has(collection.rootUrl));
  return [...current, ...legacy].sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

export function collectionPaths(collection: Collection, baseDir = docsDirectory(), supportPath?: string): string[] {
  if (collection.snapshot) return [join(baseDir, collection.id)];
  if (!supportPath) throw new Error("Legacy collection location is unavailable.");
  return [join(supportPath, "collections", `${collection.id}.json`), join(supportPath, "collections", collection.id)];
}

export async function renameCollection(collection: Collection, title: string, baseDir = docsDirectory(), supportPath?: string): Promise<void> {
  const updated = { ...collection, title: title.trim(), customTitle: title.trim() };
  if (!updated.title) throw new Error("Enter a name for this documentation collection.");
  const file = collection.snapshot
    ? join(baseDir, collection.id, "current.json")
    : supportPath && join(supportPath, "collections", `${collection.id}.json`);
  if (!file) throw new Error("Collection location is unavailable.");
  const pending = `${file}.${randomUUID()}.tmp`;
  if (collection.snapshot) await writeFile(pending, JSON.stringify(updated), "utf8");
  else {
    const data = JSON.parse(await readFile(file, "utf8")) as { pages: SavedPage[]; collection: Collection };
    await writeFile(pending, JSON.stringify({ ...data, collection: updated }), "utf8");
  }
  await rename(pending, file);
}

const STOP_WORDS = new Set(["a", "an", "and", "do", "does", "for", "how", "i", "in", "is", "of", "the", "this", "to", "with"]);

function queryTerms(query: string): string[] {
  return [...new Set(query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])].filter((term) => !STOP_WORDS.has(term));
}

function excerptFor(markdown: string, terms: string[]): string {
  const paragraphs = markdown.split(/\n\s*\n/).map((value) => value.replace(/[#*`]/g, "").replace(/\s+/g, " ").trim())
    .filter((value) => value.length >= 45 && !value.startsWith("- ") && !value.startsWith("Source:"));
  const ranked = paragraphs.map((paragraph, position) => ({
    paragraph,
    score: terms.filter((term) => paragraph.toLocaleLowerCase().includes(term)).length * 100 - position,
  })).sort((a, b) => b.score - a.score);
  return (ranked[0]?.paragraph ?? markdown.replace(/[#*`\n]/g, " ").replace(/\s+/g, " ").trim()).slice(0, 220);
}

function relevance(page: SavedPage, terms: string[], rank: number, query: string): number {
  const title = page.title.toLocaleLowerCase();
  const path = new URL(page.url).pathname.replace(/[-_/]+/g, " ").toLocaleLowerCase();
  const phrase = query.toLocaleLowerCase().trim();
  const titleHits = terms.filter((term) => title.includes(term)).length;
  return (title.includes(phrase) ? 500 : 0) + (path.includes(phrase) ? 250 : 0) + titleHits * 80 - rank;
}

export async function searchLibrary(query: string, baseDir = docsDirectory(), supportPath?: string): Promise<SearchResult[]> {
  const collections = await listCollections(baseDir, supportPath);
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const search = async (joiner: " AND " | " OR "): Promise<SearchResult[]> => {
    const expression = terms.map((term) => `"${term}"`).join(joiner);
    const results: SearchResult[] = [];
    for (const collection of collections) {
    if (collection.snapshot) {
      const path = join(baseDir, collection.id, "snapshots", collection.snapshot, "index.sqlite");
      const db = new DatabaseSync(path, { readOnly: true });
      try {
        const rows = (expression
          ? db.prepare("SELECT pages.url, pages.title, pages.markdown, pages.fetchedAt, bm25(pages_fts, 10, 1) AS rank FROM pages_fts JOIN pages ON pages.rowid = pages_fts.rowid WHERE pages_fts MATCH ? ORDER BY rank LIMIT 50").all(expression)
          : db.prepare("SELECT url, title, markdown, fetchedAt, 0 AS rank FROM pages ORDER BY title LIMIT 50").all()) as Array<{ url: string; title: string; markdown: string; fetchedAt: string; rank: number }>;
        for (const row of rows) {
          const page = { url: row.url, title: row.title, markdown: row.markdown, fetchedAt: row.fetchedAt };
          results.push({ page, excerpt: excerptFor(row.markdown, terms), score: relevance(page, terms, row.rank, query) });
        }
      } finally { db.close(); }
    } else if (supportPath) {
      const data = JSON.parse(await readFile(join(supportPath, "collections", `${collection.id}.json`), "utf8")) as { pages: SavedPage[] };
      results.push(...searchPages(data.pages, query).filter(({ page }) => joiner === " OR " || terms.every((term) => `${page.title} ${page.markdown}`.toLocaleLowerCase().includes(term))).slice(0, 50));
    }
    }
    return results.sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title)).slice(0, 100);
  };
  const matched = await search(" AND ");
  return matched.length ? matched : search(" OR ");
}
