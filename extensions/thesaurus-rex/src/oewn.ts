// Open English WordNet (CC BY 4.0). WN-LMF XML, one element per line.
import { createHash } from "node:crypto";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import type { DatabaseSync } from "node:sqlite";
import { insertEntries, setMeta } from "./db.ts";

export const OEWN_URL =
  "https://en-word.net/static/english-wordnet-2024.xml.gz";
export const OEWN_BYTES = 12_912_118;
/** A stalled socket would otherwise leave the download spinning with no way out. */
const DOWNLOAD_TIMEOUT_MS = 5 * 60_000;
/** Pinned: a re-cut upstream file must not silently build a different DB. */
export const OEWN_SHA256 =
  "e1f633b0a93758cae34ea27c44c4dad310a8af2467b155f99dd6673af697e875";

/** Definitions are stored as `pos \t text \t example \t example`. */
export const DEFINITION_SEPARATOR = "\t";

const LEMMA = /<Lemma writtenForm="([^"]*)" partOfSpeech="([^"]*)"/;
// attribute order varies, so id and synset are matched independently
const SENSE = /<Sense\b/;
const SENSE_ID = /\bid="([^"]*)"/;
const SENSE_SYNSET = /\bsynset="([^"]*)"/;
const ANTONYM = /<SenseRelation relType="antonym" target="([^"]*)"/;
const SYNSET = /<Synset id="([^"]*)"/;
const DEFINITION = /<Definition>([^<]*)<\/Definition>/;
const EXAMPLE = /<Example>([^<]*)<\/Example>/;
const PRONUNCIATION = /<Pronunciation[^>]*>([^<]*)<\/Pronunciation>/;

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&apos;": "'",
  "&quot;": '"',
  "&lt;": "<",
  "&gt;": ">",
};

export function unescapeXml(text: string): string {
  return text.replace(/&(?:amp|apos|quot|lt|gt);|&#(\d+);/g, (match, code) => {
    if (!code) return ENTITIES[match];
    const point = Number(code);
    // fromCodePoint throws above the Unicode range, which would abort the ingest
    return point <= 0x10ffff ? String.fromCodePoint(point) : match;
  });
}

// DDL auto-commits, so a failed run leaves these behind: every table needs its DROP.
const STAGING = `
  DROP TABLE IF EXISTS stage_sense;
  DROP TABLE IF EXISTS stage_definition;
  DROP TABLE IF EXISTS stage_antonym;
  DROP TABLE IF EXISTS stage_example;
  DROP TABLE IF EXISTS stage_pronunciation;
  CREATE TABLE stage_sense (id TEXT PRIMARY KEY, lemma TEXT, synset TEXT, pos TEXT, ordinal INTEGER) WITHOUT ROWID;
  CREATE TABLE stage_definition (synset TEXT PRIMARY KEY, text TEXT) WITHOUT ROWID;
  CREATE TABLE stage_antonym (lemma TEXT, target TEXT);
  CREATE TABLE stage_example (synset TEXT, text TEXT);
  CREATE TABLE stage_pronunciation (lemma TEXT, text TEXT);
`;

const DROP_STAGING = `
  DROP TABLE IF EXISTS stage_sense;
  DROP TABLE IF EXISTS stage_definition;
  DROP TABLE IF EXISTS stage_antonym;
  DROP TABLE IF EXISTS stage_example;
  DROP TABLE IF EXISTS stage_pronunciation;
`;

/** SQLite rather than JS maps: in memory this peaked at 481MB and blew Raycast's heap. */
export async function stageOewn(
  db: DatabaseSync,
  lines: AsyncIterable<string> | Iterable<string>,
): Promise<void> {
  db.exec(STAGING);
  const addSense = db.prepare(
    "INSERT OR IGNORE INTO stage_sense (id, lemma, synset, pos, ordinal) VALUES (?, ?, ?, ?, ?)",
  );
  const addDefinition = db.prepare(
    "INSERT OR IGNORE INTO stage_definition (synset, text) VALUES (?, ?)",
  );
  const addAntonym = db.prepare(
    "INSERT INTO stage_antonym (lemma, target) VALUES (?, ?)",
  );
  const addExample = db.prepare(
    "INSERT INTO stage_example (synset, text) VALUES (?, ?)",
  );
  const addPronunciation = db.prepare(
    "INSERT INTO stage_pronunciation (lemma, text) VALUES (?, ?)",
  );

  let lemma = "";
  let pos = "";
  let synset = "";
  // file order is WordNet's frequency ranking, and SQLite's sort isn't stable
  let ordinal = 0;

  db.exec("BEGIN");
  try {
    for await (const line of lines) {
      const lemmaMatch = LEMMA.exec(line);
      if (lemmaMatch) {
        lemma = unescapeXml(lemmaMatch[1]).toLowerCase();
        pos = lemmaMatch[2];
        ordinal = 0;
        continue;
      }
      if (SENSE.test(line) && lemma) {
        const id = SENSE_ID.exec(line);
        const synsetRef = SENSE_SYNSET.exec(line);
        if (id && synsetRef)
          addSense.run(id[1], lemma, synsetRef[1], pos, ordinal++);
        continue;
      }
      const antonymMatch = ANTONYM.exec(line);
      if (antonymMatch && lemma) {
        addAntonym.run(lemma, antonymMatch[1]);
        continue;
      }
      const synsetMatch = SYNSET.exec(line);
      if (synsetMatch) {
        synset = synsetMatch[1];
        continue;
      }
      const definitionMatch = DEFINITION.exec(line);
      if (definitionMatch && synset) {
        addDefinition.run(synset, unescapeXml(definitionMatch[1]).trim());
        continue;
      }
      const exampleMatch = EXAMPLE.exec(line);
      if (exampleMatch && synset) {
        addExample.run(synset, unescapeXml(exampleMatch[1]).trim());
        continue;
      }
      const pronunciationMatch = PRONUNCIATION.exec(line);
      if (pronunciationMatch && lemma) {
        addPronunciation.run(lemma, unescapeXml(pronunciationMatch[1]).trim());
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function* grouped(
  rows: Iterable<{ lemma: string; value: string }>,
): Generator<[string, string[]]> {
  let current = "";
  let values: string[] = [];
  for (const { lemma, value } of rows) {
    if (lemma !== current) {
      if (current && values.length) yield [current, values];
      current = lemma;
      values = [];
    }
    if (value && !values.includes(value)) values.push(value);
  }
  if (current && values.length) yield [current, values];
}

// without these the correlated example lookup scans stage_example per sense (~300k)
const STAGING_INDEXES = `
  CREATE INDEX IF NOT EXISTS stage_example_synset ON stage_example (synset);
  CREATE INDEX IF NOT EXISTS stage_sense_lemma ON stage_sense (lemma, ordinal);
  CREATE INDEX IF NOT EXISTS stage_sense_synset ON stage_sense (synset);
  CREATE INDEX IF NOT EXISTS stage_pronunciation_lemma ON stage_pronunciation (lemma);
  CREATE INDEX IF NOT EXISTS stage_antonym_lemma ON stage_antonym (lemma);
`;

export async function buildFromStaging(db: DatabaseSync): Promise<{
  definitions: number;
  antonyms: number;
  synonyms: number;
  pronunciations: number;
}> {
  db.exec(STAGING_INDEXES);

  const definitionRows = db
    .prepare(
      `SELECT s.lemma AS lemma,
              s.pos || ? || d.text || coalesce(
                (SELECT ? || group_concat(e.text, ?) FROM stage_example e WHERE e.synset = s.synset),
                ''
              ) AS value
         FROM stage_sense s JOIN stage_definition d ON d.synset = s.synset
        ORDER BY s.lemma, s.ordinal`,
    )
    .iterate(
      DEFINITION_SEPARATOR,
      DEFINITION_SEPARATOR,
      DEFINITION_SEPARATOR,
    ) as Iterable<{
    lemma: string;
    value: string;
  }>;
  const definitions = await insertEntries(
    db,
    "def",
    "wordnet",
    grouped(definitionRows),
  );

  // `ordinal` restarts per part of speech, so it can't rank the four zeroth senses of
  // "down" against each other. Shared-synset count is the tie-break.
  const synonymRows = db
    .prepare(
      `SELECT a.lemma AS lemma, b.lemma AS value
         FROM stage_sense a JOIN stage_sense b ON b.synset = a.synset
        WHERE b.lemma <> a.lemma
        GROUP BY a.lemma, b.lemma
        ORDER BY a.lemma,
                 instr(b.lemma, ' ') > 0,       -- multiword phrases after single words
                 count(DISTINCT a.synset) DESC, -- senses shared with the query word
                 min(a.ordinal), min(b.ordinal), b.lemma`,
    )
    .iterate() as Iterable<{ lemma: string; value: string }>;
  const synonyms = await insertEntries(
    db,
    "syn",
    "wordnet",
    grouped(synonymRows),
  );

  const pronunciationRows = db
    .prepare(
      `SELECT lemma, text AS value FROM stage_pronunciation
        WHERE text <> '' ORDER BY lemma`,
    )
    .iterate() as Iterable<{ lemma: string; value: string }>;
  const pronunciations = await insertEntries(
    db,
    "pro",
    "wordnet",
    grouped(pronunciationRows),
  );

  const antonymRows = db
    .prepare(
      `SELECT a.lemma AS lemma, s.lemma AS value
         FROM stage_antonym a JOIN stage_sense s ON s.id = a.target
        WHERE s.lemma <> a.lemma
        ORDER BY a.lemma, s.ordinal`,
    )
    .iterate() as Iterable<{ lemma: string; value: string }>;
  const antonyms = await insertEntries(
    db,
    "ant",
    "wordnet",
    grouped(antonymRows),
  );

  db.exec(DROP_STAGING);
  db.exec("VACUUM");
  return { definitions, antonyms, synonyms, pronunciations };
}

export function splitDefinition(entry: string): {
  pos: string;
  text: string;
  examples: string[];
} {
  const [pos, text, ...examples] = entry.split(DEFINITION_SEPARATOR);
  return { pos, text: text ?? "", examples };
}

export async function ingestOewn(
  db: DatabaseSync,
  signal?: AbortSignal,
  onBytes?: (bytes: number) => void,
): Promise<{
  definitions: number;
  antonyms: number;
  synonyms: number;
  pronunciations: number;
}> {
  const deadline = AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS);
  const response = await fetch(OEWN_URL, {
    signal: signal ? AbortSignal.any([signal, deadline]) : deadline,
  });
  if (!response.ok || !response.body)
    throw new Error(`WordNet download failed (${response.status})`);

  // Buffered, not piped: a SHA-256 is only known after the last byte, so streaming
  // into the parser would mean parsing 13MB before knowing whether to trust it.
  // Which is why the size is capped: the whole body lands in Raycast's heap before
  // a single byte of it has been checked, so a redirect to something huge would be
  // an out-of-memory crash. The pinned hash matches one file, of exactly one size.
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of Readable.fromWeb(
    response.body,
  ) as AsyncIterable<Buffer>) {
    if ((bytes += chunk.length) > OEWN_BYTES)
      throw new Error("WordNet download is larger than the expected file");
    chunks.push(chunk);
    onBytes?.(bytes);
  }
  const archive = Buffer.concat(chunks);

  const actual = createHash("sha256").update(archive).digest("hex");
  if (actual !== OEWN_SHA256)
    throw new Error(
      `WordNet download does not match the expected file (sha256 ${actual})`,
    );

  const lines = createInterface({
    input: Readable.from(archive).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  await stageOewn(db, lines);
  const counts = await buildFromStaging(db);

  setMeta(db, "wordnet:source", OEWN_URL);
  setMeta(db, "wordnet:downloaded", new Date().toISOString());
  setMeta(db, "wordnet:definitions", String(counts.definitions));
  setMeta(db, "wordnet:antonyms", String(counts.antonyms));
  setMeta(db, "wordnet:synonyms", String(counts.synonyms));
  setMeta(db, "wordnet:pronunciations", String(counts.pronunciations));
  return counts;
}
