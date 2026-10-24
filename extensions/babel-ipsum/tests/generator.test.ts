import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  formatGeneratedText,
  formatTextWithAttribution,
  generationQuery,
  parseCountInput,
  validateGenerationRequest,
  selectPreview,
  updateCountInput,
  pasteActionTitle,
  orderedActions,
  SessionPools,
  defaultBookId,
  orderBooks,
  sectionsQuery,
  bookQuery,
  escapeMarkdown,
  type Book,
  type CountInput,
  type GeneratedUnit,
  type GenerationRequest,
} from "../src/generator.ts";

test("validates strict positive counts and unit-specific limits", () => {
  for (const [unit, maximum] of [
    ["sentences", 20],
    ["passages", 10],
  ] as const) {
    assert.deepEqual(validateGenerationRequest(unit, "1"), { unit, count: 1 });
    assert.deepEqual(validateGenerationRequest(unit, maximum), { unit, count: maximum });
    for (const invalid of [
      "",
      " ",
      " 3",
      "3 ",
      "03",
      "1.0",
      "1e1",
      "+1",
      "-1",
      "0",
      "1.5",
      "3x",
      "1; DROP TABLE stories",
      maximum + 1,
      NaN,
      Infinity,
      null,
      true,
    ]) {
      assert.throws(() => validateGenerationRequest(unit, invalid), /whole number/);
    }
  }
  assert.throws(() => validateGenerationRequest("words", 3), /Choose sentences or passages/);
});

test("defaults omitted or blank count inputs to three for either unit", () => {
  for (const unit of ["passages", "sentences"] as const) {
    for (const count of [undefined, "", " ", "\t\n"]) {
      assert.deepEqual(parseCountInput(unit, count), { unit, count: 3 });
    }
    assert.deepEqual(parseCountInput(unit, "  4\t"), { unit, count: 4 });
  }
});

test("rejects invalid nonblank count inputs", () => {
  for (const [unit, maximum] of [
    ["passages", 10],
    ["sentences", 20],
  ] as const) {
    for (const count of ["1", String(maximum)]) {
      assert.deepEqual(parseCountInput(unit, count), { unit, count: Number(count) });
    }
    for (const count of [
      "03",
      "1.0",
      "1e1",
      "+1",
      "-1",
      "0",
      "1.5",
      "3x",
      " 0 ",
      "1; DROP TABLE stories",
      String(maximum + 1),
      "9007199254740993",
      null,
      true,
    ]) {
      assert.throws(() => parseCountInput(unit, count), new RegExp(`whole number from 1 to ${maximum}`));
    }
  }
});

test("uses the configured default for an empty field and when clearing edited input", () => {
  for (const [unit, defaultCount] of [
    ["passages", 7],
    ["sentences", 14],
  ] as const) {
    let state: CountInput = { input: "", request: parseCountInput(unit, "", defaultCount) };
    assert.equal(state.input, "");
    assert.deepEqual(state.request, { unit, count: defaultCount });
    state = updateCountInput(state, "2", defaultCount);
    assert.equal(state.request.count, 2);
    state = updateCountInput(state, "invalid", defaultCount);
    assert.equal(state.request.count, 2);
    assert.match(state.error ?? "", /whole number/);
    for (const input of ["", " ", "\t\n"]) {
      state = updateCountInput(state, input, defaultCount);
      assert.equal(state.input, input);
      assert.deepEqual(state.request, { unit, count: defaultCount });
      assert.equal(state.error, undefined);
    }
    assert.throws(() => parseCountInput(unit, "0", defaultCount), /whole number/);
    assert.throws(() => parseCountInput(unit, "", 21), /whole number/);
  }
});

function fixture(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE books(id TEXT PRIMARY KEY, title TEXT, author TEXT, language TEXT, locale TEXT, direction TEXT,
      source_url TEXT, edition TEXT, scope TEXT, license TEXT, attribution TEXT, editorial_note TEXT, sentence_separator TEXT);
    CREATE TABLE sections(id INTEGER PRIMARY KEY, book_id TEXT REFERENCES books(id), source_id TEXT, title TEXT, position INTEGER, edition TEXT, source_url TEXT, revision_url TEXT, snapshot_sha256 TEXT);
    CREATE TABLE passages(id INTEGER PRIMARY KEY, section_id INTEGER REFERENCES sections(id), position INTEGER, kind TEXT, text TEXT);
    CREATE TABLE sentences(id INTEGER PRIMARY KEY, passage_id INTEGER REFERENCES passages(id), position INTEGER, text TEXT);
    CREATE TABLE metadata(key TEXT, value TEXT);
    INSERT INTO books VALUES
      ('de-finibus', 'De finibus', 'Cicero', 'Latin', 'la', 'ltr', 'https://example.com/a', '1873', 'Book I', 'Public domain', 'Source contributors', 'Original spelling', ' '),
      ('sub-terra', 'Sub terra', 'Baldomero Lillo', 'Spanish', 'es', 'ltr', 'https://example.com/c', '1917', 'Complete collection', 'Public domain', 'Source contributors', 'Modernized spelling', ' ');
    INSERT INTO sections VALUES (1, 'de-finibus', 'section-a', 'Section A', 1, '1904', 'https://example.com/a', 'https://example.com/a?oldid=1', 'hash-a'),
      (2, 'de-finibus', 'section-b', 'Section B', 2, '1917', 'https://example.com/b', 'https://example.com/b?oldid=2', 'hash-b'),
      (3, 'sub-terra', 'other-book', 'Other book', 1, '1917', 'https://example.com/c', 'https://example.com/c?oldid=3', 'hash-c');
  `);
  for (let id = 1; id <= 24; id++) {
    db.prepare("INSERT INTO passages VALUES (?, ?, ?, ?, ?)").run(
      id,
      id > 12 ? 3 : (id % 2) + 1,
      id,
      "prose",
      `Párrafo ${id}. Otra oración.`,
    );
    for (let position = 1; position <= 2; position++) {
      db.prepare("INSERT INTO sentences VALUES (?, ?, ?, ?)").run(
        (id - 1) * 2 + position,
        id,
        position,
        `Oración ${id}-${position}.`,
      );
    }
  }
  return db;
}

test("selects complete independent units with correct story context and no repeated source rows", () => {
  const db = fixture();
  try {
    for (const settings of [
      { unit: "sentences", count: 20 },
      { unit: "passages", count: 10 },
    ] satisfies GenerationRequest[]) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const rows = db.prepare(generationQuery(settings.unit, "de-finibus")).all() as GeneratedUnit[];
        assert.equal(rows.length, settings.count);
        assert.equal(new Set(rows.map((row) => row.id)).size, settings.count);
        for (const row of rows) {
          const passage =
            settings.unit === "passages"
              ? row.id
              : db.prepare("SELECT passage_id FROM sentences WHERE id = ?").get(row.id)?.passage_id;
          const section = db.prepare("SELECT section_id FROM passages WHERE id = ?").get(passage as number)?.section_id;
          assert.equal(row.section_id, section);
          assert.equal(row.book_id, "de-finibus");
          assert.match(row.revision_url, /oldid=[12]$/);
        }
        const text = formatGeneratedText(settings, rows);
        assert.equal(text, rows.map((row) => row.text).join(settings.unit === "sentences" ? " " : "\n\n"));
      }
    }
    assert.equal(db.prepare("SELECT count(*) AS total FROM sentences").get()?.total, 48);
  } finally {
    db.close();
  }
});

test("formats plain Spanish text and rejects incomplete, blank, or duplicate results", () => {
  const db = fixture();
  try {
    const settings: GenerationRequest = { unit: "passages", count: 2 };
    const rows = (db.prepare(generationQuery(settings.unit, "de-finibus")).all() as GeneratedUnit[]).slice(0, 2);
    rows[0].text = "  ¿Qué pasó? —Nada.  ";
    rows[1].text = "¡Aquí está!";
    assert.equal(formatGeneratedText(settings, rows), "¿Qué pasó? —Nada.\n\n¡Aquí está!");
    assert.equal(formatGeneratedText({ unit: "sentences", count: 2 }, rows), "¿Qué pasó? —Nada. ¡Aquí está!");
    assert.throws(() => formatGeneratedText(settings, []), /Not enough source text/);
    assert.throws(() => formatGeneratedText(settings, rows.slice(0, 1)), /Not enough source text/);
    assert.throws(() => formatGeneratedText(settings, [rows[0], rows[0]]), /Not enough source text/);
    assert.throws(() => formatGeneratedText(settings, [{ ...rows[0], text: " " }, rows[1]]), /Not enough source text/);
  } finally {
    db.close();
  }
});

test("count edits preserve ordered prefixes, formatting, and only displayed attribution", () => {
  const db = fixture();
  try {
    for (const unit of ["passages", "sentences"] as const) {
      const pool = db.prepare(generationQuery(unit, "de-finibus")).all() as GeneratedUnit[];
      const original = JSON.stringify(pool);
      let state: CountInput = { input: "3", request: parseCountInput(unit, "3") };
      const initial = selectPreview(state.request, pool);
      state = updateCountInput(state, "5");
      const grown = selectPreview(state.request, pool);
      assert.deepEqual(grown.selected.slice(0, 3), initial.selected);
      state = updateCountInput(state, "2");
      const shrunk = selectPreview(state.request, pool);
      assert.deepEqual(shrunk.selected, grown.selected.slice(0, 2));
      assert.equal(shrunk.text, shrunk.selected.map((row) => row.text).join(unit === "sentences" ? " " : "\n\n"));
      state = updateCountInput(state, "5");
      assert.deepEqual(selectPreview(state.request, pool), grown);
      for (const input of ["bad", "0", "03", "1.5", "21"]) {
        state = updateCountInput(state, input);
        assert.equal(state.input, input);
        assert.match(state.error ?? "", /whole number/);
        assert.deepEqual(selectPreview(state.request, pool), grown);
      }
      for (const input of ["", " ", "\t\n"]) {
        state = updateCountInput(state, input);
        assert.equal(state.input, input);
        assert.equal(state.error, undefined);
        assert.deepEqual(selectPreview(state.request, pool), initial);
      }
      state = updateCountInput(state, "1");
      assert.equal(selectPreview(state.request, pool).selected.length, 1);
      assert.equal(JSON.stringify(pool), original);
    }
  } finally {
    db.close();
  }
});

test("attribution preserves the exact Unicode preview prefix and the selected book's provenance", () => {
  const db = fixture();
  try {
    const book = db.prepare(bookQuery("sub-terra")).get() as Book;
    book.title = "Sub terra — 진달래꽃";
    book.attribution = "Baldomero Lillo; Wikisource contributors.";
    book.license = "CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/";
    book.editorial_note = "Spelling and accents modernized; transcription errors corrected.";
    for (const unit of ["passages", "sentences"] as const) {
      const pool = db.prepare(generationQuery(unit, book.id)).all() as GeneratedUnit[];
      pool[0].text = "¿Qué pasó? —Nada.\n春眠不覺曉。 أجنحةٌ *متكسرةٌ*.";
      const preview = selectPreview({ unit, count: 1 }, pool);
      const original = JSON.stringify({ book, preview });
      const copied = formatTextWithAttribution(book, preview);
      assert.equal(copied.slice(0, preview.text.length + 2), `${preview.text}\n\n`);
      assert.ok(copied.includes("Title: Sub terra — 진달래꽃"));
      assert.ok(copied.includes("Author: Baldomero Lillo"));
      assert.ok(copied.includes("Edition: 1917"));
      assert.ok(copied.includes(`Source attribution: ${book.attribution}`));
      assert.ok(copied.includes(`License: ${book.license}`));
      assert.ok(copied.includes("Modifications: Excerpts selected and combined by Babel Ipsum."));
      assert.ok(copied.includes(`Editorial note: ${book.editorial_note}`));
      assert.ok(copied.includes("Other book (1917)\nhttps://example.com/c\nhttps://example.com/c?oldid=3"));
      assert.ok(copied.includes("أجنحةٌ *متكسرةٌ*."));
      assert.ok(!copied.includes("Cicero"));
      assert.equal(JSON.stringify({ book, preview }), original);
    }
  } finally {
    db.close();
  }
});

test("attribution includes only displayed sections and deduplicates their source and pinned URLs", () => {
  const db = fixture();
  try {
    const book = db.prepare(bookQuery("de-finibus")).get() as Book;
    const sections = db.prepare(sectionsQuery(book.id)).all();
    const pool = (db.prepare(generationQuery("passages", book.id)).all() as GeneratedUnit[]).map((row, index) => ({
      ...row,
      ...(index < 2 ? sections[0] : sections[1]),
    }));
    const request = { unit: "passages", count: 3 } as const;
    const grown = formatTextWithAttribution(book, selectPreview(request, pool));
    for (const section of sections) {
      assert.equal(grown.split(`${section.title} (${section.edition})`).length - 1, 1);
      for (const url of [section.source_url, section.revision_url]) {
        assert.equal(grown.split("\n").filter((line) => line === url).length, 1);
      }
    }
    const shrunk = formatTextWithAttribution(book, selectPreview({ ...request, count: 2 }, pool));
    assert.ok(shrunk.includes("Section A (1904)"));
    assert.ok(!shrunk.includes("Section B"));
    assert.ok(!shrunk.includes("https://example.com/b"));
    assert.ok(!shrunk.includes("https://example.com/c"));
    const sharedUrls = pool.map((row) => ({ ...row, source_url: pool[0].revision_url }));
    const shared = formatTextWithAttribution(book, selectPreview(request, sharedUrls));
    const urls = shared.split("\n").filter((line) => line.startsWith("https://"));
    assert.deepEqual(urls, [sections[0].revision_url, sections[1].revision_url]);
  } finally {
    db.close();
  }
});

test("rejects incomplete or corrupt pools even if the requested prefix would be usable", () => {
  const db = fixture();
  try {
    const pool = db.prepare(generationQuery("passages", "de-finibus")).all() as GeneratedUnit[];
    const request = { unit: "passages", count: 1 } as const;
    for (const broken of [
      [],
      pool.slice(0, 3),
      [...pool.slice(0, 9), pool[0]],
      [...pool.slice(0, 9), { ...pool[9], text: " " }],
    ]) {
      assert.throws(() => selectPreview(request, broken), /Not enough source text/);
    }
    assert.throws(() => selectPreview({ unit: "passages", count: 11 }, pool), /whole number/);
    assert.throws(() => generationQuery("words" as never, "de-finibus"), /Choose sentences or passages/);
  } finally {
    db.close();
  }
});

test("paste label uses a usable captured application name or the authorized fallback", () => {
  assert.equal(pasteActionTitle("  Visual Studio Code  "), "Paste to Visual Studio Code");
  for (const name of [undefined, null, "", "  ", "Raycast", "raycast", "App\nName", 42]) {
    assert.equal(pasteActionTitle(name), "Paste to Active App");
  }
});

test("the configured primary action comes first while both actions remain available", () => {
  assert.deepEqual(orderedActions("copy"), ["copy", "paste"]);
  assert.deepEqual(orderedActions("paste"), ["paste", "copy"]);
});

test("queries isolate every selected book and reject SQL injection", () => {
  const db = fixture();
  try {
    for (const unit of ["passages", "sentences"] as const) {
      for (const book of ["de-finibus", "sub-terra"]) {
        const rows = db.prepare(generationQuery(unit, book)).all() as GeneratedUnit[];
        assert.ok(rows.length >= 10);
        assert.equal(db.prepare(bookQuery(book)).get()?.id, book);
        assert.ok(rows.every((row) => row.book_id === book));
        assert.deepEqual(
          db
            .prepare(sectionsQuery(book))
            .all()
            .map((row) => row.section_id),
          book === "sub-terra" ? [3] : [1, 2],
        );
      }
      for (const id of ["x' OR 1=1 --", "", "foo_bar", "../book"]) {
        assert.throws(() => generationQuery(unit, id), /valid book/);
        assert.throws(() => sectionsQuery(id), /valid book/);
        assert.throws(() => bookQuery(id), /valid book/);
      }
    }
  } finally {
    db.close();
  }
});

test("verse retains line breaks, sentences flatten whitespace, CJK joins without spaces, and Arabic stays raw", () => {
  const db = fixture();
  try {
    const rows = (db.prepare(generationQuery("passages", "de-finibus")).all() as GeneratedUnit[]).slice(0, 2);
    rows[0].text = "春眠不覺曉。\n處處聞啼鳥。";
    rows[1].text = "夜來風雨聲。";
    rows.forEach((row) => {
      row.sentence_separator = "";
    });
    assert.equal(
      formatGeneratedText({ unit: "passages", count: 2 }, rows),
      "春眠不覺曉。\n處處聞啼鳥。\n\n夜來風雨聲。",
    );
    assert.equal(formatGeneratedText({ unit: "sentences", count: 2 }, rows), "春眠不覺曉。處處聞啼鳥。夜來風雨聲。");
    assert.equal(escapeMarkdown("First line\nSecond line"), "First line  \nSecond line");
    rows[0].text = "أجنحةٌ متكسرةٌ.";
    assert.equal(formatGeneratedText({ unit: "passages", count: 1 }, rows.slice(0, 1)), rows[0].text);
    assert.throws(
      () => formatGeneratedText({ unit: "passages", count: 2 }, [rows[0], { ...rows[1], book_id: "other" }]),
      /Not enough/,
    );
  } finally {
    db.close();
  }
});

test("session pools restore per-book prefixes and isolate regeneration, failures, and late responses", async () => {
  const db = fixture();
  const requests: { sql: string; resolve: (rows: GeneratedUnit[]) => void; reject: (error: Error) => void }[] = [];
  const session = new SessionPools(
    "passages",
    (sql) => new Promise((resolve, reject) => requests.push({ sql, resolve, reject })),
  );
  try {
    const first = session.load("de-finibus");
    assert.equal(session.load("de-finibus"), first);
    const other = session.load("sub-terra");
    const rowsA = db.prepare(requests[0].sql).all() as GeneratedUnit[];
    const rowsB = db.prepare(requests[1].sql).all() as GeneratedUnit[];
    requests[1].resolve(rowsB);
    assert.equal((await other).status, "ready");
    const newer = session.load("de-finibus", true);
    const newRows = [...rowsA].reverse();
    requests[2].resolve(newRows);
    assert.deepEqual(await newer, { status: "ready", rows: newRows });
    requests[0].resolve(rowsA);
    await first;
    assert.equal(session.load("de-finibus"), newer);
    assert.equal(session.load("sub-terra"), other);
    const state = await session.load("de-finibus");
    if (state.status !== "ready") assert.fail("expected a pool");
    const three = selectPreview({ unit: "passages", count: 3 }, state.rows);
    assert.deepEqual(selectPreview({ unit: "passages", count: 5 }, state.rows).selected.slice(0, 3), three.selected);
    const failed = session.load("de-finibus", true);
    requests[3].reject(new Error("Broken book"));
    assert.deepEqual(await failed, { status: "error", message: "Broken book" });
    assert.deepEqual(await other, { status: "ready", rows: rowsB });
    const fresh = new SessionPools("passages", async () => rowsA);
    assert.notEqual(fresh.load("de-finibus"), first);
  } finally {
    db.close();
  }
});

test("book preference defaults safely and the catalog ordering is stable", () => {
  const books = [
    { id: "sub-terra", language: "Spanish", title: "Sub terra" },
    { id: "de-finibus", language: "Latin", title: "De finibus" },
    { id: "macbeth", language: "English", title: "Macbeth" },
  ] as Book[];
  assert.equal(defaultBookId(undefined, books), "de-finibus");
  assert.equal(defaultBookId("missing", books), "de-finibus");
  assert.equal(defaultBookId("sub-terra", books), "sub-terra");
  assert.deepEqual(
    orderBooks(books).map((book) => book.id),
    ["de-finibus", "macbeth", "sub-terra"],
  );
  assert.deepEqual(
    orderBooks(books, "sub-terra").map((book) => book.id),
    ["sub-terra", "macbeth", "de-finibus"],
  );
  assert.equal(books[0].id, "sub-terra");
});

test("manifest preserves shortcut and preference contracts with all thirteen book choices", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.deepEqual(
    manifest.commands.map((command: { name: string; title: string }) => [command.name, command.title]),
    [
      ["generate-paragraphs", "Generate Passages"],
      ["generate-sentences", "Generate Sentences"],
    ],
  );
  const preferences = new Map<
    string,
    { default: string; title: string; required: boolean; data?: { value: string }[] }
  >(manifest.preferences.map((preference: { name: string }) => [preference.name, preference]));
  assert.equal(preferences.get("defaultParagraphCount")?.default, "3");
  assert.equal(preferences.get("defaultParagraphCount")?.title, "Default Passage Count");
  assert.equal(preferences.get("defaultSentenceCount")?.default, "3");
  assert.equal(preferences.get("primaryAction")?.default, "copy");
  const book = preferences.get("defaultBook");
  assert.equal(book?.default, "de-finibus");
  assert.equal(book?.required, false);
  assert.equal(book?.data?.length, 13);
  assert.ok(!book?.data?.some((item) => ["godaan", "crime-and-punishment"].includes(item.value)));
  assert.equal(new Set(book?.data?.map((item) => item.value)).size, 13);
});

test("each command owns its pool and corrupt book results fail without leaking another book", async () => {
  const db = fixture();
  try {
    const passageSession = new SessionPools("passages", async (sql) => db.prepare(sql).all() as GeneratedUnit[]);
    const sentenceSession = new SessionPools("sentences", async (sql) => db.prepare(sql).all() as GeneratedUnit[]);
    const passages = await passageSession.load("de-finibus");
    const sentences = await sentenceSession.load("de-finibus");
    assert.equal(passages.status, "ready");
    assert.equal(sentences.status, "ready");
    if (passages.status === "ready" && sentences.status === "ready") {
      assert.equal(passages.rows.length, 10);
      assert.equal(sentences.rows.length, 20);
    }
    const wrongBook = new SessionPools(
      "passages",
      async () => db.prepare(generationQuery("passages", "sub-terra")).all() as GeneratedUnit[],
    );
    assert.deepEqual(await wrongBook.load("de-finibus"), {
      status: "error",
      message: "Source text belongs to another book.",
    });
    const incomplete = new SessionPools("passages", async () => []);
    assert.equal((await incomplete.load("de-finibus")).status, "error");
  } finally {
    db.close();
  }
});
