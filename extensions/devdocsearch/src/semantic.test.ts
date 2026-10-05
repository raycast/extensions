import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import type { Collection } from "./library";
import { isSemanticIndexPaused, pauseSemanticBackfill, semanticIndexStatus } from "./semantic";
import { defaultEmbeddingConfig } from "./embedding-config";

test("semantic status reports saved vectors, live progress, interruption, and missing indexes", () => {
  const base = mkdtempSync(join(tmpdir(), "docsearch-semantic-status-"));
  const collection: Collection = {
    id: "collection", rootUrl: "https://example.com/docs", title: "Docs", pageCount: 4,
    importedAt: "2026-01-01", errors: [], truncated: false, snapshot: "snapshot",
  };
  const snapshot = join(base, collection.id, "snapshots", collection.snapshot!);
  mkdirSync(snapshot, { recursive: true });
  try {
    assert.equal(semanticIndexStatus(collection, defaultEmbeddingConfig, base), "Vectors not built");
    const db = new DatabaseSync(join(snapshot, "semantic.sqlite"));
    try {
      db.exec("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT); CREATE TABLE indexed_pages (url TEXT PRIMARY KEY)");
      const put = db.prepare("INSERT OR REPLACE INTO meta VALUES (?, ?)");
      put.run("model", "agentmish/pplx-embed-v1-0.6b-mlx@edc2b94227d1e4b8e185c1cf6db7d20d6759879b");
      put.run("chunker", "title-headings-300-40-v4");
      put.run("complete", "0");
      put.run("pid", String(process.pid));
      db.exec("INSERT INTO indexed_pages VALUES ('a'), ('b')");
      assert.equal(semanticIndexStatus(collection, defaultEmbeddingConfig, base), "Vectors 50% (2/4 pages)");
      put.run("current_passages", "8");
      put.run("total_passages", "40");
      assert.equal(semanticIndexStatus(collection, defaultEmbeddingConfig, base), "Vectors 55% (2/4 pages) · page 20% (8/40 passages)");
      db.exec("DELETE FROM meta WHERE key IN ('current_passages', 'total_passages')");
      put.run("pid", "999999999");
      assert.equal(semanticIndexStatus(collection, defaultEmbeddingConfig, base), "Vectors stopped (2/4)");
      pauseSemanticBackfill(base);
      assert.equal(isSemanticIndexPaused(base), true);
      assert.equal(semanticIndexStatus(collection, defaultEmbeddingConfig, base), "Vectors paused at 50% (2/4 pages)");
      db.exec("INSERT INTO indexed_pages VALUES ('c'), ('d')");
      put.run("complete", "1");
      db.exec("DELETE FROM meta WHERE key='pid'");
      assert.equal(semanticIndexStatus(collection, defaultEmbeddingConfig, base), "Vectors ready");
      put.run("chunker", "old");
      assert.equal(semanticIndexStatus(collection, defaultEmbeddingConfig, base), "Vectors need rebuild");
    } finally { db.close(); }
  } finally { rmSync(base, { recursive: true, force: true }); }
});
