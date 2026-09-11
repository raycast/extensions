import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { dbPath, insertEntries, lookup, openDb } from "./db.ts";
import {
  buildFromStaging,
  ingestOewn,
  OEWN_BYTES,
  splitDefinition,
  stageOewn,
  unescapeXml,
} from "./oewn.ts";

// Shaped after the real file: entries first, synsets later, antonyms pointing both ways.
const FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<LexicalResource>
  <Lexicon id="oewn" version="2024">
    <LexicalEntry id="oewn-good-a">
      <Lemma writtenForm="Good" partOfSpeech="a"/>
      <Sense id="oewn-good__3.00.00.." synset="oewn-001-a">
        <SenseRelation relType="antonym" target="oewn-bad__3.00.00.."/>
      </Sense>
      <Sense id="oewn-good__3.00.01.." synset="oewn-002-a"/>
    </LexicalEntry>
    <LexicalEntry id="oewn-bad-a">
      <Lemma writtenForm="bad" partOfSpeech="a"/>
      <Sense id="oewn-bad__3.00.00.." synset="oewn-003-a">
        <SenseRelation relType="antonym" target="oewn-good__3.00.00.."/>
        <SenseRelation relType="similar" target="oewn-awful__3.00.00.."/>
      </Sense>
    </LexicalEntry>
    <LexicalEntry id="oewn-hood-n">
      <Lemma writtenForm="&apos;hood" partOfSpeech="n"/>
      <Sense id="oewn--ap-hood__1.14.01.." synset="oewn-004-n"/>
    </LexicalEntry>
    <LexicalEntry id="oewn-execute-v">
      <Lemma writtenForm="execute" partOfSpeech="v">
        <Pronunciation>ˈɛksɪˌkjuːt</Pronunciation>
      </Lemma>
      <Sense id="oewn-execute__2.41.00.." subcat="vtaa" synset="oewn-005-v"/>
    </LexicalEntry>
    <LexicalEntry id="oewn-down-n">
      <Lemma writtenForm="down" partOfSpeech="n"/>
      <Sense id="oewn-down__1.00.00.." synset="oewn-010-n"/>
    </LexicalEntry>
    <LexicalEntry id="oewn-down-r">
      <Lemma writtenForm="down" partOfSpeech="r"/>
      <Sense id="oewn-down__4.00.00.." synset="oewn-011-r"/>
    </LexicalEntry>
    <LexicalEntry id="oewn-down-a">
      <Lemma writtenForm="down" partOfSpeech="a"/>
      <Sense id="oewn-down__3.00.00.." synset="oewn-012-a"/>
    </LexicalEntry>
    <LexicalEntry id="oewn-eiderdown-n">
      <Lemma writtenForm="eiderdown" partOfSpeech="n"/>
      <Sense id="oewn-eiderdown__1.00.00.." synset="oewn-010-n"/>
    </LexicalEntry>
    <LexicalEntry id="oewn-down_feather-n">
      <Lemma writtenForm="down feather" partOfSpeech="n"/>
      <Sense id="oewn-down_feather__1.00.00.." synset="oewn-010-n"/>
    </LexicalEntry>
    <LexicalEntry id="oewn-downward-r">
      <Lemma writtenForm="downward" partOfSpeech="r"/>
      <Sense id="oewn-downward__4.00.00.." synset="oewn-011-r"/>
    </LexicalEntry>
    <LexicalEntry id="oewn-downward-a">
      <Lemma writtenForm="downward" partOfSpeech="a"/>
      <Sense id="oewn-downward__3.00.00.." synset="oewn-012-a"/>
    </LexicalEntry>
    <Synset id="oewn-001-a" members="oewn-good-a" partOfSpeech="a">
      <Definition>having desirable qualities</Definition>
      <Definition>an alternate wording that should be ignored</Definition>
    </Synset>
    <Synset id="oewn-002-a" members="oewn-good-a" partOfSpeech="a">
      <Definition>morally admirable</Definition>
    </Synset>
    <Synset id="oewn-003-a" members="oewn-bad-a" partOfSpeech="a">
      <Definition>having undesirable qualities</Definition>
    </Synset>
    <Synset id="oewn-004-n" members="oewn-hood-n" partOfSpeech="n">
      <Definition>a neighborhood &amp; its people</Definition>
    </Synset>
    <Synset id="oewn-005-v" members="oewn-execute-v" partOfSpeech="v">
      <Definition>carry out or perform an action</Definition>
      <Example>execute the decision of the people</Example>
      <Example>she did not want to perform</Example>
    </Synset>
  </Lexicon>
</LexicalResource>`;

const values = (entries: { value: string }[]) => entries.map((e) => e.value);

async function ingestFixture() {
  const dir = await mkdtemp(join(tmpdir(), "trex-oewn-"));
  const db = openDb(dbPath(dir));
  await stageOewn(db, FIXTURE.split("\n"));
  const counts = await buildFromStaging(db);
  return { db, counts };
}

test("unescapeXml handles named and numeric entities", () => {
  assert.equal(unescapeXml("rock &amp; roll"), "rock & roll");
  assert.equal(unescapeXml("&apos;hood"), "'hood");
  assert.equal(unescapeXml("&#8216;to&#8217;"), "‘to’");
  assert.equal(unescapeXml("&#99999999;"), "&#99999999;", "out of range, kept");
});

test("definitions land per lemma, first wording per synset, POS tagged", async () => {
  const { db, counts } = await ingestFixture();
  assert.equal(counts.definitions, 4);
  assert.deepEqual(values(lookup(db, "good", "def")), [
    "a\thaving desirable qualities",
    "a\tmorally admirable",
  ]);
  assert.deepEqual(values(lookup(db, "'hood", "def")), [
    "n\ta neighborhood & its people",
  ]);
  assert.deepEqual(
    values(lookup(db, "execute", "def")),
    [
      "v\tcarry out or perform an action\texecute the decision of the people\tshe did not want to perform",
    ],
    "senses with a subcat attribute are not dropped, examples ride along",
  );
});

test("antonyms resolve through sense ids, both directions, ignoring other relations", async () => {
  const { db, counts } = await ingestFixture();
  assert.equal(counts.antonyms, 2);
  assert.deepEqual(values(lookup(db, "good", "ant")), ["bad"]);
  assert.deepEqual(
    values(lookup(db, "bad", "ant")),
    ["good"],
    "forward reference resolved",
  );
  assert.deepEqual(
    values(lookup(db, "awful", "ant")),
    [],
    "similar is not an antonym",
  );
  assert.deepEqual(values(lookup(db, "'hood", "ant")), []);
});

test("synonyms rank by shared senses, single words before phrases", async () => {
  const { db } = await ingestFixture();
  // "down" has three senses, one per POS, all with ordinal 0 — file order alone would
  // put the noun's co-members first. Sharing two synsets is what lifts "downward".
  assert.deepEqual(values(lookup(db, "down", "syn")), [
    "downward",
    "eiderdown",
    "down feather",
  ]);
});

test("a failed ingest can be retried — staging DDL auto-commits", async () => {
  const dir = await mkdtemp(join(tmpdir(), "trex-retry-"));
  const db = openDb(dbPath(dir));

  async function* dies(): AsyncGenerator<string> {
    yield '<Lemma writtenForm="good" partOfSpeech="a"/>';
    throw new Error("connection died");
  }
  await assert.rejects(() => stageOewn(db, dies()), /connection died/);

  // the retry must not hit "table stage_example already exists"
  await stageOewn(db, FIXTURE.split("\n"));
  assert.equal((await buildFromStaging(db)).definitions, 4);
});

test("staging tables are dropped once the entries are built", async () => {
  const { db } = await ingestFixture();
  const staged = db
    .prepare(
      "SELECT count(*) AS n FROM sqlite_master WHERE name LIKE 'stage_%'",
    )
    .get() as { n: number };
  assert.equal(staged.n, 0);
});

test("a file that fails its hash never reaches the parser or the entries", async () => {
  const dir = await mkdtemp(join(tmpdir(), "trex-hash-"));
  const db = openDb(dbPath(dir));
  await insertEntries(db, "syn", "wordnet", [["run", ["sprint"]]]);

  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(gzipSync(Buffer.from(FIXTURE)), { status: 200 });
  try {
    await assert.rejects(
      () => ingestOewn(db),
      /does not match the expected file/,
    );
  } finally {
    globalThis.fetch = realFetch;
  }

  assert.deepEqual(
    values(lookup(db, "run", "syn")),
    ["sprint"],
    "the installed dictionary is untouched",
  );
  const staged = db
    .prepare(
      "SELECT count(*) AS n FROM sqlite_master WHERE name LIKE 'stage_%'",
    )
    .get() as { n: number };
  assert.equal(staged.n, 0, "nothing was staged, so nothing was parsed");
});

test("an oversized body is cut off instead of buffered", async () => {
  const dir = await mkdtemp(join(tmpdir(), "trex-size-"));
  const db = openDb(dbPath(dir));

  const chunk = Buffer.alloc(1_000_000);
  let sent = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        pull(controller) {
          sent += chunk.length;
          controller.enqueue(new Uint8Array(chunk));
        },
      }),
      { status: 200 },
    );
  try {
    await assert.rejects(() => ingestOewn(db), /larger than the expected file/);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.ok(
    sent < OEWN_BYTES + 4_000_000,
    `stopped near the cap, not after ${sent} bytes`,
  );
});

test("splitDefinition round-trips the POS tag and examples", () => {
  assert.deepEqual(splitDefinition("n\ta neighborhood"), {
    pos: "n",
    text: "a neighborhood",
    examples: [],
  });
  assert.deepEqual(splitDefinition("v\tto run\the ran\tshe runs"), {
    pos: "v",
    text: "to run",
    examples: ["he ran", "she runs"],
  });
});
