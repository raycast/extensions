import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getHistory, getLatestEntry, toggleSaved, deleteEntry, displayText } from "../../src/lib/db";

const TMP = join(tmpdir(), "handy-test-db");
let TMP_DB: string;
let RECS: string;

function createSchema(p: string) {
  const db = new Database(p);
  db.exec(`CREATE TABLE transcription_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL, timestamp INTEGER NOT NULL,
    saved BOOLEAN NOT NULL DEFAULT 0, title TEXT NOT NULL,
    transcription_text TEXT NOT NULL,
    post_processed_text TEXT, post_process_prompt TEXT
  )`);
  db.close();
}

function insert(p: string, o: {
  file_name: string; timestamp: number; saved?: boolean;
  title: string; transcription_text: string; post_processed_text?: string | null;
}) {
  const db = new Database(p);
  db.prepare(`INSERT INTO transcription_history
    (file_name,timestamp,saved,title,transcription_text,post_processed_text)
    VALUES (?,?,?,?,?,?)`
  ).run(o.file_name, o.timestamp, o.saved ? 1 : 0, o.title, o.transcription_text, o.post_processed_text ?? null);
  db.close();
}

beforeEach(() => {
  mkdirSync(TMP, { recursive: true });
  TMP_DB = join(TMP, `test-${Date.now()}.db`);
  RECS = join(TMP, "recordings");
  mkdirSync(RECS, { recursive: true });
  createSchema(TMP_DB);
});
afterEach(() => { rmSync(TMP, { recursive: true, force: true }); });

describe("getHistory", () => {
  it("returns [] when empty", () => expect(getHistory(TMP_DB)).toEqual([]));

  it("returns entries newest-first", () => {
    insert(TMP_DB, { file_name: "a.wav", timestamp: 100, title: "A", transcription_text: "first" });
    insert(TMP_DB, { file_name: "b.wav", timestamp: 200, title: "B", transcription_text: "second" });
    const r = getHistory(TMP_DB);
    expect(r[0].transcription_text).toBe("second");
    expect(r[1].transcription_text).toBe("first");
  });

  it("maps saved as boolean", () => {
    insert(TMP_DB, { file_name: "a.wav", timestamp: 1, title: "T", transcription_text: "t", saved: true });
    expect(getHistory(TMP_DB)[0].saved).toBe(true);
  });
});

describe("getLatestEntry", () => {
  it("returns null when empty", () => expect(getLatestEntry(TMP_DB)).toBeNull());
  it("returns most recent entry", () => {
    insert(TMP_DB, { file_name: "a.wav", timestamp: 100, title: "A", transcription_text: "old" });
    insert(TMP_DB, { file_name: "b.wav", timestamp: 200, title: "B", transcription_text: "new" });
    expect(getLatestEntry(TMP_DB)?.transcription_text).toBe("new");
  });
});

describe("toggleSaved", () => {
  it("flips false to true", () => {
    insert(TMP_DB, { file_name: "a.wav", timestamp: 1, title: "T", transcription_text: "t", saved: false });
    const [e] = getHistory(TMP_DB);
    toggleSaved(e.id, TMP_DB);
    expect(getHistory(TMP_DB)[0].saved).toBe(true);
  });
  it("flips true to false", () => {
    insert(TMP_DB, { file_name: "a.wav", timestamp: 1, title: "T", transcription_text: "t", saved: true });
    const [e] = getHistory(TMP_DB);
    toggleSaved(e.id, TMP_DB);
    expect(getHistory(TMP_DB)[0].saved).toBe(false);
  });
});

describe("deleteEntry", () => {
  it("removes the DB row", async () => {
    insert(TMP_DB, { file_name: "a.wav", timestamp: 1, title: "T", transcription_text: "t" });
    const [e] = getHistory(TMP_DB);
    await deleteEntry(e.id, TMP_DB, RECS);
    expect(getHistory(TMP_DB)).toHaveLength(0);
  });
  it("does not throw if WAV is missing", async () => {
    insert(TMP_DB, { file_name: "missing.wav", timestamp: 1, title: "T", transcription_text: "t" });
    const [e] = getHistory(TMP_DB);
    await expect(deleteEntry(e.id, TMP_DB, RECS)).resolves.not.toThrow();
  });
});

describe("displayText", () => {
  const base = { id: 1, file_name: "a.wav", timestamp: 1, saved: false, title: "T", post_process_prompt: null };
  it("returns post_processed_text when present", () =>
    expect(displayText({ ...base, transcription_text: "raw", post_processed_text: "processed" })).toBe("processed"));
  it("falls back to transcription_text when null", () =>
    expect(displayText({ ...base, transcription_text: "raw", post_processed_text: null })).toBe("raw"));
});
