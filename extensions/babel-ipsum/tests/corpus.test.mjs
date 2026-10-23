import { modernizeParagraph, prepareSubTerra } from "../scripts/prepare-sub-terra.mjs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import {
  BOOK_IDS,
  PASSAGE_BUDGET,
  SAMPLED_BOOK_SCOPES,
  buildCorpus,
  flattenSourceText,
  loadBooks,
  segmentSentences,
  segmentSourceSentences,
  selectPassages,
} from "../scripts/build-corpus.mjs";

test("segments Spanish questions, dialogue, abbreviations, ellipses and decimal values", () => {
  assert.deepEqual(segmentSentences("El Sr. Pérez llegó. ¿Qué pasó? —Nada. «Buenas noches.»"), [
    "El Sr. Pérez llegó.",
    "¿Qué pasó?",
    "—Nada.",
    "«Buenas noches.»",
  ]);
  assert.deepEqual(segmentSentences("—¿Vienes? —preguntó Juan. —Sí, señor."), [
    "—¿Vienes? —preguntó Juan.",
    "—Sí, señor.",
  ]);
  assert.deepEqual(segmentSentences("Se detuvo... Luego siguió. El Dr. Díaz pagó 2.50 pesos."), [
    "Se detuvo...",
    "Luego siguió.",
    "El Dr. Díaz pagó 2.50 pesos.",
  ]);
  assert.deepEqual(segmentSentences("Llegó. Y dijo:"), ["Llegó."]);
  assert.deepEqual(segmentSentences("Y dijo:"), []);
  assert.deepEqual(segmentSentences("...¡Con qué desesperados clamores! Luego calló."), [
    "...¡Con qué desesperados clamores!",
    "Luego calló.",
  ]);
});

test("modernizes whole words and applies only exact contextual corrections", () => {
  const corrections = { i: "y", mui: "muy", habia: "había", fué: "fue" };
  const edits = [{ story: "sample", paragraph: 1, find: "mas luz", replace: "más luz" }];
  assert.equal(
    modernizeParagraph("I habia mui poca luz; pidió mas luz. Fué así.", "sample", 1, corrections, edits),
    "Y había muy poca luz; pidió más luz. Fue así.",
  );
  assert.equal(modernizeParagraph("I HABIA MINA.", "sample", 2, corrections, edits), "Y HABÍA MINA.");
  assert.throws(() => modernizeParagraph("Otro texto.", "sample", 1, corrections, edits), /match exactly once/);
  assert.throws(() => modernizeParagraph("mas luz, mas luz.", "sample", 1, corrections, edits), /match exactly once/);
});

test("samples whole passages reproducibly across sections using UTF-8 bytes", () => {
  const sections = Array.from({ length: 3 }, (_, section) => ({
    id: `section-${section}`,
    passages: Array.from({ length: 12 }, (_, position) => ({
      position: position + 1,
      text: `漢字${section}${position}`,
    })),
  }));
  const original = JSON.stringify(sections);
  const sampled = selectPassages(sections, 100);
  assert.equal(sampled.length, 3);
  assert.ok(sampled.every((section) => section.passages.length >= 2));
  const bytes = sampled
    .flatMap((section) => section.passages)
    .reduce((sum, passage) => sum + Buffer.byteLength(passage.text), 0);
  assert.ok(bytes <= 100);
  assert.deepEqual(selectPassages(sections, 100), sampled);
  for (const section of sampled) {
    const source = sections.find((original) => original.id === section.id);
    assert.ok(section.passages.every((passage) => source.passages.includes(passage)));
    assert.deepEqual(
      section.passages.map((passage) => passage.position),
      section.passages.map((passage) => passage.position).sort((a, b) => a - b),
    );
  }
  assert.equal(JSON.stringify(sections), original);
  assert.deepEqual(selectPassages(sections, 1000), sections);
  assert.deepEqual(selectPassages([{ id: "oversized", passages: [{ position: 1, text: "漢".repeat(10) }] }], 10), []);
  assert.throws(() => selectPassages(sections, 0), /positive bytes/);
});

test("recognizes multilingual sentence punctuation without treating verse lines as boundaries", () => {
  assert.deepEqual(segmentSourceSentences("—¿Vienes? —preguntó Juan. —Sí, señor.", "es"), [
    "—¿Vienes? —preguntó Juan.",
    "—Sí, señor.",
  ]);
  assert.deepEqual(segmentSourceSentences("你好。再見！", "zh-Hant"), ["你好。", "再見！"]);
  assert.deepEqual(segmentSourceSentences("こんにちは。さようなら！", "ja"), ["こんにちは。", "さようなら！"]);
  assert.deepEqual(segmentSourceSentences("春眠不覺曉，\n處處聞啼鳥。", "zh-Hant"), ["春眠不覺曉，處處聞啼鳥。"]);
  assert.deepEqual(segmentSourceSentences("春の\n夜です。", "ja"), ["春の夜です。"]);
  assert.deepEqual(segmentSourceSentences("« Viens ! » dit-il. Il partit.", "fr"), [
    "« Viens ! » dit-il.",
    "Il partit.",
  ]);
  assert.deepEqual(segmentSourceSentences("« Viens ! » Il partit.", "fr"), ["« Viens ! »", "Il partit."]);
  assert.deepEqual(segmentSourceSentences("He brought food, etc.", "en"), ["He brought food, etc."]);
  assert.deepEqual(segmentSourceSentences("Dr. Smith left. He returned.", "en"), ["Dr. Smith left.", "He returned."]);
  assert.deepEqual(segmentSourceSentences("वह आया। फिर चला गया।", "hi"), ["वह आया।", "फिर चला गया।"]);
  assert.deepEqual(segmentSourceSentences("جاء. أين ذهب؟", "ar"), ["جاء.", "أين ذهب؟"]);
  assert.deepEqual(segmentSourceSentences("Nel mezzo\ndel cammin di nostra vita.\nPoi disse:", "it"), [
    "Nel mezzo del cammin di nostra vita.",
  ]);
  assert.deepEqual(segmentSourceSentences("나 보기가 역겨워\n가실 때에는", "ko"), ["나 보기가 역겨워 가실 때에는"]);
});

test("rebuilds all thirteen offline books with provenance, bounded selection, and preserved Sub terra", () => {
  const directory = mkdtempSync(join(process.cwd(), ".corpus-test-"));
  const database = join(directory, "corpus.db");
  try {
    const stats = buildCorpus(database);
    assert.equal(stats.length, 13);
    assert.ok(!stats.some((book) => ["godaan", "crime-and-punishment"].includes(book.id)));
    assert.equal(PASSAGE_BUDGET, 101_461);
    assert.deepEqual(Object.keys(SAMPLED_BOOK_SCOPES).sort(), [
      "divina-commedia",
      "journey-to-the-west",
      "kokoro",
      "les-miserables-fantine",
    ]);
    const sampledBooks = new Set(Object.keys(SAMPLED_BOOK_SCOPES));
    const sources = loadBooks();
    const db = new DatabaseSync(database, { readOnly: true });
    try {
      assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
      assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
      assert.deepEqual(
        db
          .prepare("SELECT id FROM books ORDER BY id")
          .all()
          .map((row) => row.id),
        [...BOOK_IDS].sort(),
      );
      assert.equal(
        db.prepare("SELECT count(*) AS total FROM sections WHERE book_id = 'sub-terra' AND edition = '1904'").get()
          .total,
        8,
      );
      assert.equal(
        db.prepare("SELECT count(*) AS total FROM sections WHERE book_id = 'sub-terra' AND edition = '1917'").get()
          .total,
        5,
      );
      assert.ok(
        stats.every(
          (book) =>
            book.passages >= 10 &&
            book.sentences >= 20 &&
            (!sampledBooks.has(book.id) || book.passageBytes <= PASSAGE_BUDGET),
        ),
      );
      assert.equal(db.prepare("SELECT value FROM metadata WHERE key = 'passage_budget_bytes'").get().value, "101461");
      assert.deepEqual(
        JSON.parse(db.prepare("SELECT value FROM metadata WHERE key = 'sampled_book_ids'").get().value).sort(),
        [...sampledBooks].sort(),
      );
      const original = JSON.parse(readFileSync("corpus/editorial/sub-terra/original.json", "utf8"));
      assert.equal(
        db
          .prepare(
            "SELECT count(*) AS total FROM passages p JOIN sections s ON s.id = p.section_id WHERE s.book_id = 'sub-terra'",
          )
          .get().total,
        original.stories.reduce((total, story) => total + story.paragraphs.length, 0),
      );
      assert.match(
        db.prepare("SELECT text FROM passages WHERE id = 1").get().text,
        /^La extracción de un caballo en la mina, acontecimiento no muy frecuente, había agrupado/,
      );
      const storyParagraph = db.prepare(
        "SELECT p.text FROM passages p JOIN sections s ON s.id = p.section_id WHERE s.book_id = 'sub-terra' AND s.title = ? AND p.position = ?",
      );
      assert.match(storyParagraph.get("Cañuela y Petaca", 7).text, /emprendiendo en seguida/);
      assert.match(storyParagraph.get("Cañuela y Petaca", 36).text, /pólvora estuviera chueca/);
      assert.match(storyParagraph.get("Cañuela y Petaca", 38).text, /le señaló entonces la boca del cañón/);
      assert.match(storyParagraph.get("Cañuela y Petaca", 38).text, /silbidos surcaron el aire/);
      assert.match(storyParagraph.get("Cañuela y Petaca", 38).text, /se fabricaría un trabuco/);
      assert.throws(() => db.exec("DELETE FROM books"), /readonly/i);
      for (const source of sources) {
        const stored = db
          .prepare(
            "SELECT p.text, p.position, p.kind, s.source_id FROM passages p JOIN sections s ON s.id = p.section_id WHERE s.book_id = ? ORDER BY s.position, p.position",
          )
          .all(source.book.id);
        const sourceById = new Map(source.sections.map((section) => [section.id, section]));
        for (const passage of stored) {
          const expected = sourceById
            .get(passage.source_id)
            .passages.find((candidate) => candidate.position === passage.position);
          assert.equal(passage.text, expected.text);
          assert.equal(passage.kind, expected.kind);
        }
        const preparedBytes = source.sections
          .flatMap((section) => section.passages)
          .reduce((sum, passage) => sum + Buffer.byteLength(passage.text), 0);
        if (!sampledBooks.has(source.book.id) || preparedBytes <= PASSAGE_BUDGET)
          assert.equal(
            stored.length,
            source.sections.reduce((sum, section) => sum + section.passages.length, 0),
            `${source.book.id} retains its complete prepared text`,
          );
        if (sampledBooks.has(source.book.id)) {
          assert.ok(stored.length < source.sections.reduce((sum, section) => sum + section.passages.length, 0));
          assert.equal(
            db.prepare("SELECT count(*) AS n FROM sections WHERE book_id = ?").get(source.book.id).n,
            source.sections.length,
            `${source.book.id} retains coverage across all prepared sections`,
          );
          assert.match(db.prepare("SELECT scope FROM books WHERE id = ?").get(source.book.id).scope, /sampled/);
        }
        assert.ok(
          db
            .prepare(
              "SELECT count(*) AS count FROM sections WHERE book_id = ? AND source_url <> '' AND revision_url <> '' AND length(snapshot_sha256) = 64",
            )
            .get(source.book.id).count > 0,
        );
      }
      const sentences = db
        .prepare(
          "SELECT u.text, p.text AS passage, b.locale FROM sentences u JOIN passages p ON u.passage_id = p.id JOIN sections s ON s.id = p.section_id JOIN books b ON b.id = s.book_id",
        )
        .all();
      assert.ok(sentences.every((row) => flattenSourceText(row.passage, row.locale).includes(row.text)));
      // Ancient Greek critical supplements use literal angle brackets. They are
      // source punctuation, not leaked HTML, and must survive plain-text output.
      assert.ok(sentences.every((row) => !row.text.includes("\n")));
      assert.equal(db.prepare("SELECT direction FROM books WHERE id = 'the-broken-wings'").get().direction, "rtl");
      assert.equal(
        db.prepare("SELECT sentence_separator FROM books WHERE id = 'journey-to-the-west'").get().sentence_separator,
        "",
      );
      assert.equal(db.prepare("SELECT sentence_separator FROM books WHERE id = 'kokoro'").get().sentence_separator, "");
      for (const bookId of ["macbeth", "divina-commedia", "jindallae-kkot", "oedipus-tyrannus"]) {
        assert.ok(
          db
            .prepare(
              "SELECT count(*) AS count FROM passages p JOIN sections s ON p.section_id = s.id WHERE s.book_id = ? AND instr(p.text, char(10)) > 0",
            )
            .get(bookId).count > 0,
          `${bookId} preserves verse lines`,
        );
      }
      const manifest = JSON.parse(readFileSync("package.json", "utf8"));
      const defaults = manifest.preferences.find((preference) => preference.name === "defaultBook");
      assert.equal(defaults.default, "de-finibus");
      assert.deepEqual(defaults.data.map((option) => option.value).sort(), [...BOOK_IDS].sort());
    } finally {
      db.close();
    }
    // Catch stale packaged content without depending on SQLite's file-header
    // version, which can differ across supported Node.js releases.
    const rebuilt = new DatabaseSync(database, { readOnly: true });
    const packaged = new DatabaseSync("assets/corpus.db", { readOnly: true });
    try {
      for (const table of ["books", "sections", "passages", "sentences", "metadata"]) {
        const order = table === "metadata" ? "key" : "id";
        const digest = (database) =>
          createHash("sha256")
            .update(JSON.stringify(database.prepare(`SELECT * FROM ${table} ORDER BY ${order}`).all()))
            .digest("hex");
        assert.equal(digest(packaged), digest(rebuilt), `Packaged ${table} differs from the offline rebuild`);
      }
    } finally {
      rebuilt.close();
      packaged.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Sub terra prepared book matches its retained editorial inputs", () => {
  assert.deepEqual(JSON.parse(readFileSync("corpus/books/sub-terra.json", "utf8")), prepareSubTerra());
});

test("builds all thirteen books from prepared JSON without a source cache", () => {
  const directory = mkdtempSync(".corpus-test-no-cache-");
  try {
    mkdirSync(join(directory, "scripts"));
    mkdirSync(join(directory, "assets"));
    cpSync("scripts/build-corpus.mjs", join(directory, "scripts/build-corpus.mjs"));
    cpSync("corpus/books", join(directory, "corpus/books"), { recursive: true });
    const result = spawnSync(process.execPath, ["scripts/build-corpus.mjs"], { cwd: directory, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const db = new DatabaseSync(join(directory, "assets/corpus.db"), { readOnly: true });
    try {
      assert.equal(db.prepare("SELECT count(*) AS count FROM books").get().count, 13);
      const counts = db
        .prepare(
          `
        SELECT b.id, count(DISTINCT p.id) AS passages, count(u.id) AS sentences
        FROM books b JOIN sections s ON s.book_id = b.id
        JOIN passages p ON p.section_id = s.id LEFT JOIN sentences u ON u.passage_id = p.id
        GROUP BY b.id
      `,
        )
        .all();
      assert.equal(counts.length, 13);
      for (const book of counts) {
        assert.ok(book.passages >= 10, `${book.id}: maximum passage request is available`);
        assert.ok(book.sentences >= 20, `${book.id}: maximum sentence request is available`);
      }
    } finally {
      db.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
