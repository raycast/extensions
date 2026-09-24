import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  buildContentSearchQuery,
  noteMatch,
  noteSearchKey,
  OCTARINE_DB_PATH,
  toContentMatches,
  type ContentMatchRow,
} from "@commands/search-notes/lib/note-search";
import type { IndexedNote } from "@type/notes";

describe("note content search", () => {
  it("resolves the Octarine database in Application Support", () => {
    expect(OCTARINE_DB_PATH).toBe(
      path.join(os.homedir(), "Library", "Application Support", "Octarine", "octarine.sqlite"),
    );
  });

  it("skips empty queries", () => {
    expect(buildContentSearchQuery("   ")).toBeUndefined();
  });

  it("requires every normalized token in note content", () => {
    const db = createSearchDb();
    const insert = db.prepare(
      "INSERT INTO search_documents (workspace_id, path, body, frontmatter) VALUES (?, ?, ?, ?)",
    );
    insert.run("work", "match.md", "Project", "summary: Meeting");
    insert.run("work", "partial.md", "Project", "");
    insert.run("missing", "orphan.md", "Project Meeting", "");

    const query = buildContentSearchQuery("  Project   Meeting  ");
    const rows = db.prepare(query ?? "").all() as ContentMatchRow[];
    db.close();

    expect(rows.map((row) => row.path)).toEqual(["match.md"]);
    expect(rows[0].excerpt).toContain("Project");
  });

  it("matches non-ASCII content without case sensitivity", () => {
    const db = createSearchDb();
    db.prepare("INSERT INTO search_documents (workspace_id, path, body, frontmatter) VALUES (?, ?, ?, ?)").run(
      "work",
      "accented.md",
      "CAFÉ",
      "summary: Última",
    );

    const query = buildContentSearchQuery("café última");
    const rows = db.prepare(query ?? "").all() as ContentMatchRow[];
    db.close();

    expect(rows.map((row) => row.path)).toEqual(["accented.md"]);
    expect(rows[0].queryKey).toBe("café última");
    expect(rows[0].excerpt.length).toBeLessThanOrEqual(200);
  });

  it("builds the excerpt from frontmatter when the first token only appears there", () => {
    const db = createSearchDb();
    db.prepare("INSERT INTO search_documents (workspace_id, path, body, frontmatter) VALUES (?, ?, ?, ?)").run(
      "work",
      "frontmatter.md",
      "Unrelated body",
      "summary: Hidden context",
    );

    const query = buildContentSearchQuery("hidden");
    const rows = db.prepare(query ?? "").all() as ContentMatchRow[];
    db.close();

    expect(rows.map((row) => row.path)).toEqual(["frontmatter.md"]);
    expect(rows[0].excerpt).toContain("Hidden context");
  });

  it("executes queries containing SQL and wildcard characters", () => {
    const db = createSearchDb();
    const insert = db.prepare(
      "INSERT INTO search_documents (workspace_id, path, body, frontmatter) VALUES (?, ?, ?, ?)",
    );
    insert.run("work", "literal.md", "author's 100%_plan", "");
    insert.run("work", "wildcard.md", "author's 100AAplan", "");

    const query = buildContentSearchQuery("author's 100%_plan");
    const rows = db.prepare(query ?? "").all() as ContentMatchRow[];
    db.close();

    expect(rows.map((row) => row.path)).toEqual(["literal.md"]);
  });

  it("builds normalized excerpts keyed by workspace and note path", () => {
    const matches = toContentMatches(
      [
        {
          queryKey: "query",
          workspacePath: "/notes/Work",
          path: "projects/alpha.md",
          excerpt: "  first line\nsecond   line  ",
        },
      ],
      "query",
    );

    expect(matches.get(noteSearchKey("/notes/Work", "projects/alpha.md"))).toEqual({
      excerpt: "…first line second line…",
    });
  });

  it("ignores rows produced by a previous query", () => {
    const matches = toContentMatches(
      [{ queryKey: "previous", workspacePath: "/notes/Work", path: "project.md", excerpt: "old match" }],
      "current",
    );

    expect(matches.size).toBe(0);
  });

  it("ignores malformed or empty excerpts", () => {
    const rows = [
      { queryKey: "query", workspacePath: 42, path: "malformed.md", excerpt: "match" },
      { queryKey: "query", workspacePath: "/notes/Work", path: "empty.md", excerpt: "   " },
      { queryKey: "query", workspacePath: "/notes/Work", path: "valid.md", excerpt: "match" },
    ] as unknown as ContentMatchRow[];
    const matches = toContentMatches(rows, "query");

    expect(matches.has(noteSearchKey("42", "malformed.md"))).toBe(false);
    expect(matches.has(noteSearchKey("/notes/Work", "empty.md"))).toBe(false);
    expect(matches.has(noteSearchKey("/notes/Work", "valid.md"))).toBe(true);
  });
});

describe("note match", () => {
  const contentMatches = new Map([[noteSearchKey("/notes/Alpha", "alpha.md"), { excerpt: "…needle in content…" }]]);

  it("prefers metadata matches over content matches", () => {
    const match = noteMatch(indexedNote("Alpha"), { matchesMetadata: () => true, contentMatches });

    expect(match).toEqual({ kind: "metadata" });
  });

  it("reports the content excerpt when only the content matches", () => {
    const match = noteMatch(indexedNote("Alpha"), { matchesMetadata: () => false, contentMatches });

    expect(match).toEqual({ kind: "content", excerpt: "…needle in content…" });
  });

  it("returns no match when neither metadata nor content matches", () => {
    const match = noteMatch(indexedNote("Alpha"), { matchesMetadata: () => false, contentMatches: new Map() });

    expect(match).toBeUndefined();
  });
});

function indexedNote(title: string): IndexedNote {
  const workspace = { name: "Alpha", path: "/notes/Alpha" };
  const notePath = `${title.toLowerCase()}.md`;

  return {
    id: `${workspace.path}::${notePath}`,
    title,
    path: notePath,
    folder: { name: "", path: "", workspace },
    pinned: false,
    searchText: `${title} alpha`.toLowerCase(),
  };
}

function createSearchDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE workspaces (id TEXT PRIMARY KEY, path TEXT NOT NULL);
    CREATE TABLE search_documents (
      workspace_id TEXT NOT NULL,
      path TEXT NOT NULL,
      body TEXT NOT NULL,
      frontmatter TEXT NOT NULL
    );
  `);
  db.prepare("INSERT INTO workspaces (id, path) VALUES (?, ?)").run("work", "/notes/Work");
  return db;
}
