import { createHash } from "node:crypto";
import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readJSON = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));

// Match O Alienista's passage-text size, while retaining complete works in full.
export const PASSAGE_BUDGET = 101_461;
export const SAMPLED_BOOK_SCOPES = Object.freeze({
  "les-miserables-fantine":
    "Passages sampled across all eight books of Fantine only; bundled chapter links identify the selection.",
  "divina-commedia":
    "Verse passages sampled across Inferno, Purgatorio, and Paradiso; bundled canto links identify the selection.",
  "journey-to-the-west":
    "Complete prose and verse units sampled throughout the 100-chapter novel; bundled chapter links identify the selection.",
  kokoro: "Complete paragraphs sampled across all 110 numbered subdivisions of all three parts of Kokoro.",
});
export const BOOK_IDS = [
  "sub-terra",
  "de-finibus",
  "cuentos-de-la-selva",
  "o-alienista",
  "macbeth",
  "les-miserables-fantine",
  "divina-commedia",
  "die-verwandlung",
  "journey-to-the-west",
  "kokoro",
  "jindallae-kkot",
  "oedipus-tyrannus",
  "the-broken-wings",
];

export function segmentSentences(paragraph) {
  const sentences = [];
  let start = 0;
  for (let index = 0; index < paragraph.length; index++) {
    if (!/[.!?…]/u.test(paragraph[index])) continue;
    if (paragraph[index] === ".") {
      if (/\d/u.test(paragraph[index - 1] ?? "") && /\d/u.test(paragraph[index + 1] ?? "")) continue;
      const prefix = paragraph.slice(start, index + 1);
      if (
        /(?<!\p{L})(?:Sr|Sra|Srta|Dr|Dra|D|Dña|Ud|Uds|Vd|Vds|Mr|Mrs|St|etc|pág|págs|núm|vol|cap)\.$/iu.test(prefix) ||
        /(?<!\p{L})\p{Lu}\.$/u.test(prefix)
      )
        continue;
    }
    let end = index + 1;
    while (end < paragraph.length && /[.!?…»”"')\]]/u.test(paragraph[end])) end++;
    const rest = paragraph.slice(end).trimStart();
    const following = rest.replace(/^[—–\-«“"'(\[\s]+/u, "");
    // Keep lowercase dialogue attributions attached to the preceding speech.
    // Split before a new capitalized dialogue turn, which ICU can leave joined.
    if (rest && !/^[¿¡\p{Lu}]/u.test(following)) {
      index = end - 1;
      continue;
    }
    const sentence = paragraph.slice(start, end).trim();
    if (/\p{L}/u.test(sentence)) {
      sentences.push(sentence);
      start = end;
    }
    index = end - 1;
  }
  // Speech introductions ending in a colon remain available as paragraphs,
  // but their incomplete final clause isn't offered as a standalone sentence.
  return sentences;
}

// Use source order for storage, but spread selection through every section.
// The first, last and middle candidates are visited before progressively finer gaps.
function spreadIndices(length) {
  if (!length) return [];
  if (length === 1) return [0];
  const result = [0, length - 1];
  const gaps = [[1, length - 2]];
  for (let cursor = 0; cursor < gaps.length; cursor++) {
    const [left, right] = gaps[cursor];
    if (left > right) continue;
    const middle = Math.floor((left + right) / 2);
    result.push(middle);
    gaps.push([left, middle - 1], [middle + 1, right]);
  }
  return result;
}

export function selectPassages(sections, budget = PASSAGE_BUDGET) {
  if (!Number.isSafeInteger(budget) || budget < 1) throw new Error("The passage budget must be positive bytes.");
  const total = sections.reduce(
    (sum, section) => sum + section.passages.reduce((bytes, passage) => bytes + Buffer.byteLength(passage.text), 0),
    0,
  );
  if (total <= budget) return sections.map((section) => ({ ...section, passages: [...section.passages] }));
  const selections = sections.map(() => new Set());
  const orders = sections.map((section) => spreadIndices(section.passages.length));
  let bytes = 0;
  const rounds = Math.max(0, ...orders.map((order) => order.length));
  for (let round = 0; round < rounds; round++) {
    for (const [index, section] of sections.entries()) {
      const candidate = orders[index][round];
      if (candidate === undefined) continue;
      const size = Buffer.byteLength(section.passages[candidate].text);
      if (bytes + size > budget) continue;
      selections[index].add(candidate);
      bytes += size;
    }
  }
  return sections
    .map((section, index) => ({
      ...section,
      passages: section.passages.filter((_, position) => selections[index].has(position)),
    }))
    .filter((section) => section.passages.length);
}

export function flattenSourceText(text, locale) {
  const separator = /^(?:zh|ja)(?:-|$)/u.test(locale) ? "" : " ";
  return text
    .replace(/\r\n?/gu, "\n")
    .replace(/[^\S\n]+/gu, " ")
    .replace(/ *\n+ */gu, separator)
    .trim();
}

export function segmentSourceSentences(text, locale) {
  // A printed verse line is not a sentence boundary. Keep original punctuation,
  // including unpunctuated complete source units; never manufacture punctuation.
  const flat = flattenSourceText(text, locale);
  // Reuse the reviewed Spanish dialogue policy for Quiroga as well as Lillo.
  if (/^es(?:-|$)/u.test(locale)) return segmentSentences(flat);
  const segmenter = new Intl.Segmenter(locale, { granularity: "sentence" });
  const ranges = [];
  for (const { index, segment } of segmenter.segment(flat)) {
    const previous = ranges.at(-1);
    if (
      previous &&
      /(?<!\p{L})(?:Mr|Mrs|Ms|Dr|Prof|Mme|Mlle|M|Sr|Sra|St|etc|bzw|Nr)\.$/iu.test(
        flat.slice(previous.start, previous.end).trimEnd(),
      )
    ) {
      previous.end = index + segment.length;
      continue;
    }
    ranges.push({ start: index, end: index + segment.length });
  }
  const sentences = [];
  for (const range of ranges) {
    const previous = sentences.at(-1);
    const value = flat.slice(range.start, range.end);
    const trimmed = value.trimStart();
    // ICU can split French speech before a spaced closing guillemet. Move the
    // closing punctuation to its speech, retaining a lowercase attribution too.
    const closer = trimmed.match(/^[»”’」』》】）)\]]+/u);
    if (previous && closer) {
      const end = range.start + value.length - trimmed.length + closer[0].length;
      const after = flat.slice(end, range.end).trimStart();
      previous.end = /^\p{Ll}/u.test(after) ? range.end : end;
      if (/^\p{Ll}/u.test(after)) continue;
      range.start = end;
    } else if (
      previous &&
      /^\p{Ll}/u.test(trimmed) &&
      /[.!?…][»”’"')\]]+$/u.test(flat.slice(previous.start, previous.end).trimEnd())
    ) {
      previous.end = range.end;
      continue;
    }
    const sentence = flat.slice(range.start, range.end).trim();
    if (/\p{L}/u.test(sentence) && !/[:：]$/u.test(sentence)) sentences.push(range);
  }
  return sentences.map(({ start, end }) => flat.slice(start, end).trim());
}

function normalizedText(passage) {
  const text = passage.text.normalize("NFC").replace(/\r\n?/gu, "\n");
  return passage.kind === "prose"
    ? text.replace(/\s+/gu, " ").trim()
    : text
        .split("\n")
        .map((line) => line.replace(/[^\S\n]+/gu, " ").trim())
        .join("\n")
        .replace(/\n{3,}/gu, "\n\n")
        .trim();
}

function validateSource(input) {
  const book = input.book;
  for (const key of [
    "id",
    "title",
    "author",
    "language",
    "locale",
    "direction",
    "sourceUrl",
    "edition",
    "scope",
    "license",
    "attribution",
    "editorialNote",
  ]) {
    if (typeof book?.[key] !== "string" || !book[key].trim()) throw new Error(`Missing book field: ${key}`);
  }
  if (input.schemaVersion !== 1 || !BOOK_IDS.includes(book.id)) throw new Error(`Unknown book: ${book.id}`);
  if (!["ltr", "rtl"].includes(book.direction) || !["", " "].includes(book.sentenceSeparator))
    throw new Error(`${book.id}: invalid text direction or sentence separator`);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(input.retrievedOn) || !input.sections?.length)
    throw new Error(`${book.id}: missing source date or sections`);
  const ids = new Set();
  const positions = new Set();
  const sections = input.sections.map((section) => {
    if (
      !section.id ||
      ids.has(section.id) ||
      !Number.isSafeInteger(section.position) ||
      section.position < 1 ||
      positions.has(section.position)
    )
      throw new Error(`${book.id}: duplicate or invalid source section`);
    ids.add(section.id);
    positions.add(section.position);
    for (const key of ["title", "sourceUrl", "revisionUrl", "snapshotPath", "snapshotSha256"])
      if (typeof section[key] !== "string" || !section[key]) throw new Error(`${book.id}: missing ${key}`);
    for (const url of [section.sourceUrl, section.revisionUrl, book.sourceUrl])
      if (!["https:", "http:"].includes(new URL(url).protocol)) throw new Error(`${book.id}: invalid source URL`);
    const snapshotPath = resolve(root, section.snapshotPath);
    if (!snapshotPath.startsWith(join(root, ".cache/corpus/sources", book.id) + "/"))
      throw new Error(`${book.id}: invalid snapshot path`);
    if (!/^[a-f0-9]{64}$/u.test(section.snapshotSha256))
      throw new Error(`${book.id}/${section.id}: invalid source snapshot hash`);
    const passagePositions = new Set();
    if (!section.passages?.length) throw new Error(`${book.id}/${section.id}: no passages`);
    const passages = section.passages.map((passage) => {
      if (!Number.isSafeInteger(passage.position) || passage.position < 1 || passagePositions.has(passage.position))
        throw new Error(`${book.id}/${section.id}: invalid passage position`);
      passagePositions.add(passage.position);
      if (!["prose", "verse", "speech"].includes(passage.kind) || typeof passage.text !== "string")
        throw new Error(`${book.id}/${section.id}: invalid passage`);
      const text = normalizedText(passage);
      if (!/\p{L}/u.test(text) || /<\/?(?:p|span|div)\b|Obtenido de|Descargar como/u.test(text))
        throw new Error(`${book.id}/${section.id}/${passage.position}: unexpected source furniture`);
      return { ...passage, text };
    });
    return { ...section, passages: passages.sort((a, b) => a.position - b.position) };
  });
  return { ...input, sections: sections.sort((a, b) => a.position - b.position) };
}

export function loadBooks() {
  // Only this explicit catalog is bundled; other prepared books remain archival inputs.
  return BOOK_IDS.map((id) => {
    const source = validateSource(readJSON(`corpus/books/${id}.json`));
    if (source.book.id !== id) throw new Error(`Book ID does not match filename: ${id}`);
    return source;
  });
}

export function buildCorpus(outputPath = join(root, "assets/corpus.db")) {
  const sources = loadBooks();
  const temporaryPath = `${outputPath}.building`;
  writeFileSync(temporaryPath, "");
  const db = new DatabaseSync(temporaryPath);
  const stats = [];
  let success = false;
  try {
    db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA user_version = 2;
      CREATE TABLE books (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL, language TEXT NOT NULL,
        locale TEXT NOT NULL, direction TEXT NOT NULL CHECK(direction IN ('ltr', 'rtl')),
        source_url TEXT NOT NULL, edition TEXT NOT NULL, scope TEXT NOT NULL,
        license TEXT NOT NULL, attribution TEXT NOT NULL, editorial_note TEXT NOT NULL,
        sentence_separator TEXT NOT NULL CHECK(sentence_separator IN ('', ' '))
      );
      CREATE TABLE sections (
        id INTEGER PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id), source_id TEXT NOT NULL,
        title TEXT NOT NULL, position INTEGER NOT NULL, edition TEXT NOT NULL,
        source_url TEXT NOT NULL, revision_url TEXT NOT NULL, snapshot_sha256 TEXT NOT NULL,
        UNIQUE(book_id, source_id), UNIQUE(book_id, position)
      );
      CREATE TABLE passages (
        id INTEGER PRIMARY KEY, section_id INTEGER NOT NULL REFERENCES sections(id),
        position INTEGER NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL CHECK(length(text) > 0),
        UNIQUE(section_id, position)
      );
      CREATE TABLE sentences (
        id INTEGER PRIMARY KEY, passage_id INTEGER NOT NULL REFERENCES passages(id),
        position INTEGER NOT NULL, text TEXT NOT NULL CHECK(length(text) > 0),
        UNIQUE(passage_id, position)
      );
      CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      BEGIN;
    `);
    const insertBook = db.prepare("INSERT INTO books VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const insertSection = db.prepare("INSERT INTO sections VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const insertPassage = db.prepare("INSERT INTO passages VALUES (?, ?, ?, ?, ?)");
    const insertSentence = db.prepare("INSERT INTO sentences VALUES (?, ?, ?, ?)");
    let sectionId = 0;
    let passageId = 0;
    let sentenceId = 0;
    for (const source of sources) {
      const book = source.book;
      const sampledScope = SAMPLED_BOOK_SCOPES[book.id];
      const selected = sampledScope ? selectPassages(source.sections) : source.sections;
      const available = source.sections.reduce((count, section) => count + section.passages.length, 0);
      const count = selected.reduce((count, section) => count + section.passages.length, 0);
      const scope = `${sampledScope ?? book.scope} Bundled ${count} of ${available} prepared passages from ${selected.length} source sections.`;
      insertBook.run(
        book.id,
        book.title,
        book.author,
        book.language,
        book.locale,
        book.direction,
        book.sourceUrl,
        book.edition,
        scope,
        book.license,
        book.attribution,
        book.editorialNote,
        book.sentenceSeparator,
      );
      const beforeSentences = sentenceId;
      let passageBytes = 0;
      let sentenceBytes = 0;
      for (const section of selected) {
        insertSection.run(
          ++sectionId,
          book.id,
          section.id,
          section.title,
          section.position,
          section.edition ?? book.edition,
          section.sourceUrl,
          section.revisionUrl,
          section.snapshotSha256,
        );
        for (const passage of section.passages) {
          insertPassage.run(++passageId, sectionId, passage.position, passage.kind, passage.text);
          passageBytes += Buffer.byteLength(passage.text);
          const sentences =
            book.id === "sub-terra"
              ? segmentSentences(passage.text)
              : segmentSourceSentences(passage.text, book.locale);
          for (const [position, sentence] of sentences.entries()) {
            insertSentence.run(++sentenceId, passageId, position + 1, sentence);
            sentenceBytes += Buffer.byteLength(sentence);
          }
        }
      }
      if (count < 10 || sentenceId - beforeSentences < 20)
        throw new Error(`${book.id}: needs at least ten passages and twenty sentence excerpts`);
      stats.push({
        id: book.id,
        sections: selected.length,
        passages: count,
        sentences: sentenceId - beforeSentences,
        passageBytes,
        sentenceBytes,
        availablePassages: available,
      });
    }
    const inputHash = createHash("sha256").update(JSON.stringify(sources)).digest("hex");
    const metadata = {
      input_sha256: inputHash,
      passage_budget_bytes: String(PASSAGE_BUDGET),
      sampled_book_ids: JSON.stringify(Object.keys(SAMPLED_BOOK_SCOPES)),
      selection_policy:
        "The passage budget applies only to the six previously sampled works; complete works are retained in full. Whole source units; first, last and progressively distributed passages, round-robin across sections; no padding or truncation.",
      sentence_policy:
        "Spanish retains the reviewed dialogue boundaries. Other books use locale-aware ICU sentence boundaries after joining printed lines. Unpunctuated complete verse units are retained without invented punctuation; incomplete colon introductions are omitted.",
      attribution: "Per-book and per-section provenance is recorded in books and sections. See corpus/NOTICE.md.",
      book_stats: JSON.stringify(stats),
    };
    for (const [key, value] of Object.entries(metadata))
      db.prepare("INSERT INTO metadata VALUES (?, ?)").run(key, value);
    db.exec("COMMIT; VACUUM;");
    if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
      throw new Error("Invalid corpus database.");
    if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Broken source relationships.");
    success = true;
  } finally {
    db.close();
    if (!success) rmSync(temporaryPath, { force: true });
  }
  renameSync(temporaryPath, outputPath);
  return stats;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const stats = buildCorpus();
  console.table(stats);
  console.log("Built assets/corpus.db from the checked-in multilingual sources.");
}
