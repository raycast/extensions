// Ported from DigUp's RulesTests.swift (the z scale, lookups, strongCount), SearchTextTests.swift (FTS patterns, kind
// hints, whole Bengali and Arabic words, widening) and CodeTests.swift (code search: a stretch found by name, the line
// that defines it), plus an end-to-end search over synthetic unit vectors: fusion, the gate, one hit per file, the
// segment a hit points at, its excerpt, kind filters and hints, and later pages that don't move the scale.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { lines, summary } from "../engine/code";
import { decodeVector } from "../engine/f16";
import { Searcher } from "../engine/searcher";
import { Store, type Candidate } from "../engine/store";
import { DIMENSION, MODALITIES, strongCount, type FileKind, type Modality, type SegmentKind } from "../engine/types";

const root = mkdtempSync(join(tmpdir(), "dig-up-searcher-"));
after(() => rmSync(root, { recursive: true, force: true }));

let made = 0;
function freshStore(code = false): Store {
  const store = Store.open(join(root, `store-${++made}`, code ? "code.sqlite" : "index.sqlite"), {
    code,
    home: "/Users/someone",
  });
  after(() => store.close());
  return store;
}

let inodes = 0;
function candidate(path: string, kind: FileKind): Candidate {
  return { path, kind, size: 1, mtime: 1, inode: ++inodes, device: 1 };
}

const MASK = (1n << 64n) - 1n;

/** DigUp's FakeEmbedder.vector(for:): the same text always gets the same unit vector. */
function fakeVector(text: string): Float32Array {
  let state = 5381n;
  for (const byte of Buffer.from(text, "utf8")) state = (state * 33n + BigInt(byte)) & MASK;
  const values = new Float32Array(DIMENSION);
  for (let i = 0; i < DIMENSION; i++) {
    state ^= (state << 13n) & MASK;
    state ^= state >> 7n;
    state ^= (state << 17n) & MASK;
    values[i] = (Number(state % 2001n) - 1000) / 1000;
  }
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  return values.map((value) => value / norm);
}

function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** A unit vector whose cosine with `query` is `cosine`: the query plus noise orthogonal to it. */
function aligned(query: Float32Array, cosine: number, seed: string): Float32Array {
  const noise = fakeVector(seed);
  const along = dot(noise, query);
  const orthogonal = noise.map((value, i) => value - along * query[i]);
  const length = Math.sqrt(dot(orthogonal, orthogonal));
  return query.map((value, i) => cosine * value + (Math.sqrt(1 - cosine * cosine) * orthogonal[i]) / length);
}

describe("the z scale (DigUp: RulesTests)", () => {
  const f32 = Math.fround;
  // Float arithmetic, as Swift does it on [Float].
  const text = Array.from({ length: 30 }, (_, i) => f32(f32(0.7) + f32(f32(i % 3) * f32(0.01))));
  const image = Array.from({ length: 30 }, (_, i) => f32(f32(0.55) + f32(f32(i % 3) * f32(0.002))));
  const scores = Float32Array.from([...text, ...image]);
  const modality: Modality[] = [...Array(30).fill("text"), ...Array(30).fill("image")];

  test("each modality's level comes out, on one shared scale", () => {
    const z = Searcher.meaning(scores, modality);
    assert.ok(Math.abs(z[1]) < 1e-4 && Math.abs(z[31]) < 1e-4); // 0.71 and 0.552: each at its modality's average
    assert.ok(Math.abs(z[2] / z[32] - 5) < 0.01); // 0.01 above average beats 0.002 above, 5:1
    const means = Searcher.modalityMeans(scores, modality);
    assert.ok(Math.abs(means.get("text")! - 0.71) < 0.001);
    assert.ok(Math.abs(means.get("image")! - 0.552) < 0.001);
    assert.ok(Math.abs(means.get("audio")! - 0.631) < 0.001); // no audio vectors: the average of all
    assert.deepEqual([...means.keys()], MODALITIES);
  });

  test("later pages are scored without moving the scale", () => {
    // A long book's later pages, far from the query, would pull the text average down and lift all text.
    const book = [...Array.from({ length: 400 }, (_, i) => f32(f32(0.6) + f32(f32(i % 5) * f32(0.004)))), f32(0.8)];
    const z = Searcher.meaning(scores, modality);
    const withBook = Searcher.meaning(
      Float32Array.from([...scores, ...book]),
      [...modality, ...Array<Modality>(book.length).fill("text")],
      [...Array(60).fill(true), ...Array(401).fill(false)],
    );
    for (let row = 0; row < 60; row++) assert.ok(Math.abs(z[row] - withBook[row]) < 1e-9);
    assert.ok(withBook[withBook.length - 1] > Math.max(...z)); // the matching page stands out on the same scale
  });

  test("the deviation never drops below 0.02", () => {
    const z = Searcher.meaning([0.5, 0.5, 0.5, 0.52], ["text", "text", "text", "text"]);
    // mean 0.505, deviation sqrt(0.000075) ≈ 0.00866 → floored at 0.02
    assert.ok(Math.abs(z[3] - 0.015 / 0.02) < 1e-6);
  });
});

describe("rules", () => {
  test("codes and long numbers are lookups (DigUp: codesAndLongNumbersAreLookups)", () => {
    assert.ok(Searcher.isLookup(["k7q2lm"]));
    assert.ok(Searcher.isLookup(["trx50"]));
    assert.ok(Searcher.isLookup(["4815162342"]));
    assert.ok(Searcher.isLookup(["2041"]));
    assert.ok(!Searcher.isLookup(["417"])); // too short to be an ID
    assert.ok(!Searcher.isLookup(["inv", "2041"])); // a word in it
    assert.ok(!Searcher.isLookup([]));
  });

  test("Han numerals are numbers, as Swift's Character.isNumber says (東京, 二月 are lookups in DigUp)", () => {
    // swiftc: Searcher.isLookup on each term, Swift 6.3.1.
    for (const term of ["東京", "京都", "二月", "三菱", "千葉", "一覧", "第一章"])
      assert.ok(Searcher.isLookup([term]), term);
    assert.ok(!Searcher.isLookup(["大阪"]));
    assert.ok(!Searcher.isLookup(["tokyo"]));
    // A letter is Alphabetic: a Devanagari vowel sign counts, as in Swift.
    assert.ok(Searcher.isLookup(["ा1"]));
  });

  test("weaker matches fold below half the top score (DigUp: weakerMatchesFoldBelowHalfTheTopScore)", () => {
    assert.equal(strongCount([6, 4.1, 3, 2.9, 0.7]), 3);
    assert.equal(strongCount([0.71]), 1);
    assert.equal(strongCount([]), 0);
    assert.equal(strongCount([0, 0]), 2); // a top score of 0 or less: all of them
  });

  test("terms: normalized content words, kind words and stopwords out, each once", () => {
    assert.deepEqual(Searcher.terms("Find the screenshots of my receipts from Tokyo"), ["receipts", "tokyo"]);
    assert.deepEqual(Searcher.terms("cat, CAT and dog-cat"), ["cat", "dog"]);
    assert.deepEqual(Searcher.terms("a b c x"), []); // one letter is no word
    assert.deepEqual(Searcher.terms("podcast about rivers"), ["podcast", "rivers"]); // a kind hint, not a stopword
    assert.deepEqual(Searcher.terms("invoice #2041 (paid)"), ["invoice", "2041", "paid"]);
    assert.deepEqual(Searcher.terms("ﬁle names"), ["names"]); // NFKC: "ﬁle" is "file", a stopword
    assert.deepEqual(Searcher.terms("আমার কুমিরের ছবি"), ["কুমিরের"]); // Bengali stopwords
    assert.deepEqual(Searcher.terms("صورة في الْمَكْتَبَةَ"), ["المكتبة"]); // Arabic stopwords; harakat dropped
    assert.deepEqual(Searcher.terms("মা"), ["মা"]); // a letter and its vowel sign: two scalars
  });

  test("query words of languages with endings are prefixes (DigUp: queryWordsOfLanguagesWithEndingsArePrefixes)", () => {
    assert.equal(Searcher.ftsQuery("কুমির"), '"কুমির"*');
    assert.equal(Searcher.ftsQuery("مدرسة الأطفال"), '"مدرسة"* OR "الاطفال"*');
    assert.equal(Searcher.ftsQuery("মা"), '"মা"*');
    assert.equal(Searcher.ftsQuery("payment error"), '"payment" OR "error"');
    assert.equal(Searcher.ftsQuery("payment err", true), '"payment" OR "err"*');
    assert.equal(Searcher.ftsQuery("the photos"), null);
    assert.deepEqual(Searcher.kindHints("জেব্রার ভিডিওতে"), new Set(["video"]));
    assert.deepEqual(Searcher.kindHints("صورة حمار وحشي"), new Set(["image"]));
  });

  test("kind hints: kind words anywhere, English only as whole words", () => {
    assert.deepEqual(Searcher.kindHints("screenshot of a receipt"), new Set(["screenshot"]));
    assert.deepEqual(Searcher.kindHints("PDFs and notes"), new Set(["pdf", "doc"]));
    assert.deepEqual(Searcher.kindHints("a podcast clip"), new Set(["audio", "video"]));
    assert.deepEqual(Searcher.kindHints("videography"), new Set()); // English doesn't attach endings
    assert.deepEqual(Searcher.kindHints("রেকর্ডিংটা"), new Set(["audio"]));
    assert.deepEqual(Searcher.kindHints("zebra"), new Set());
  });
});

describe("keyword search", () => {
  test("Bengali and Arabic words stay whole (DigUp: bengaliAndArabicWordsStayWhole)", () => {
    const store = freshStore();
    const id = store.insert(candidate("/notes/trip.txt", "doc"));
    store.addSegment({
      file: id,
      kind: "chunk",
      modality: "text",
      loc: 1,
      text: "সুন্দরবনে আমরা কুমিরও দেখেছি। قَالَ إِنَّ الْمَكْتَبَةَ تُغْلَقُ",
    });
    const searcher = new Searcher(store, { loadVectors: false });
    const bengali = searcher.search("কুমির", null);
    assert.deepEqual(
      bengali.map((hit) => hit.path),
      ["/notes/trip.txt"],
    );
    assert.ok(bengali[0].excerpt?.includes("«কুমিরও»")); // the whole word, never a piece of it
    const arabic = searcher.search("المكتبة", null);
    assert.deepEqual(
      arabic.map((hit) => hit.path),
      ["/notes/trip.txt"],
    );
    assert.ok(arabic[0].excerpt?.includes("«الْمَكْتَبَةَ»")); // quoted as written
    assert.deepEqual(searcher.search("কলকাতা", null), []);
  });

  test("a word in no file is found at the start of longer ones (DigUp: aWordInNoFileIsFoundAtTheStartOfLongerOnes)", () => {
    const store = freshStore();
    const add = (path: string, text: string, kind: FileKind = "doc", segment: SegmentKind = "chunk") => {
      const id = store.insert(candidate(path, kind));
      store.addSegment({ file: id, kind: segment, modality: "text", loc: 1, text });
    };
    add("/shots/settings.png", "Model picker: Grok4 (default)", "screenshot", "ocr");
    add("/notes/wiki.txt", "Read the Grokipedia page about rivers.");
    add("/notes/pets.txt", "The cat sleeps on the sofa.");
    add("/notes/tags.txt", "Pick a category for each photo.");
    const searcher = new Searcher(store, { loadVectors: false });
    // "grok" is in no file as a word. While it's typed (the last word as a prefix) and once typing stops, it finds the
    // same files.
    const typing = searcher.search("grok", null, { prefixLast: true });
    const stopped = searcher.search("grok", null);
    assert.deepEqual(new Set(stopped.map((hit) => hit.path)), new Set(["/shots/settings.png", "/notes/wiki.txt"]));
    assert.deepEqual(new Set(typing.map((hit) => hit.path)), new Set(stopped.map((hit) => hit.path)));
    assert.ok(stopped.find((hit) => hit.path === "/shots/settings.png")?.excerpt?.includes("«Grok4»"));
    // Another word with it: both count.
    assert.deepEqual(
      searcher.search("grok rivers", null).map((hit) => hit.path),
      ["/notes/wiki.txt", "/shots/settings.png"],
    );
    // A word that's in a file as typed stays whole: "cat" isn't "category". So do two letters.
    assert.deepEqual(
      searcher.search("cat", null).map((hit) => hit.path),
      ["/notes/pets.txt"],
    );
    assert.deepEqual(searcher.search("gr", null), []);
  });

  test("lookups weigh words double; a kind filter keeps only those kinds", () => {
    const store = freshStore();
    const shot = store.insert(candidate("/shots/booking.png", "screenshot"));
    store.addSegment({
      file: shot,
      kind: "ocr",
      modality: "text",
      text: "Booking K7Q2LM confirmed",
      excerpt: "Booking",
    });
    const notes = store.insert(candidate("/notes/k7q2lm.txt", "doc"));
    store.addSegment({ file: notes, kind: "chunk", modality: "text", loc: 1, text: "nothing here" });
    const searcher = new Searcher(store);
    const hits = searcher.search("K7Q2LM", null);
    // Words × 4 for a lookup; a tie goes to the smaller file id. The name match ranks first in bm25 (name × 3).
    assert.deepEqual(
      hits.map((hit) => [hit.path, hit.score, hit.keywordRank, hit.segment]),
      [
        ["/shots/booking.png", 4, 2, "ocr"],
        ["/notes/k7q2lm.txt", 4, 1, "name"],
      ],
    );
    assert.deepEqual(
      searcher.search("K7Q2LM", null, { kinds: ["screenshot"] }).map((hit) => [hit.path, hit.keywordRank]),
      [["/shots/booking.png", 1]],
    );
    assert.deepEqual(searcher.search("K7Q2LM", null, { kinds: [] }), []);
    assert.equal(searcher.search("K7Q2LM", null, { wordWeight: 1 })[0].score, 2);
  });

  test("a hit carries its file's facts, and the text of its segment is there for previews", () => {
    const store = freshStore();
    const id = store.insert({
      path: "/docs/arabic.txt",
      kind: "doc",
      size: 1234,
      mtime: 1_700_000_000.5,
      inode: 7,
      device: 1,
    });
    const segment = store.addSegment({
      file: id,
      kind: "chunk",
      modality: "text",
      loc: 3,
      text: "إِنَّ الْمَكْتَبَةَ",
    });
    store.finish(id, "done", null, { chunks: "3", chars: "40" });
    const searcher = new Searcher(store, { loadVectors: false });
    const [hit] = searcher.search("المكتبة", null);
    assert.deepEqual(
      { ...hit, excerpt: null },
      {
        path: "/docs/arabic.txt",
        kind: "doc",
        score: 2,
        z: null,
        cosine: null,
        keywordRank: 1,
        segment: "chunk",
        segmentId: segment,
        loc: 3,
        locEnd: null,
        excerpt: null,
        modified: 1_700_000_000.5,
        size: 1234,
        info: { chars: "40", chunks: "3" },
        focus: null,
      },
    );
    assert.equal(searcher.segmentText(segment), "إِنَّ الْمَكْتَبَةَ");
    assert.equal(searcher.segmentText(999), null);
  });
});

describe("search, end to end, on synthetic vectors", () => {
  const store = freshStore();
  const query = fakeVector("zebra crossing");
  const ids: Record<string, number> = {};
  let searcher: Searcher;

  type Part = { kind: SegmentKind; modality: Modality; cosine?: number; text?: string; loc?: number; excerpt?: string };
  const add = (path: string, kind: FileKind, parts: Part[], info: Record<string, string> = {}) => {
    const id = store.insert(candidate(path, kind));
    ids[path] = id;
    for (const part of parts) {
      store.addSegment({
        file: id,
        kind: part.kind,
        modality: part.modality,
        loc: part.loc,
        excerpt: part.excerpt,
        text: part.text,
        vector: part.cosine === undefined ? null : aligned(query, part.cosine, `${path} ${part.kind} ${part.loc}`),
      });
    }
    if (Object.keys(info).length > 0) store.finish(id, "done", null, info);
    return id;
  };

  before(() => {
    // Enough unrelated vectors that text and image each have a level of their own (20 or more).
    for (let i = 0; i < 30; i++) {
      const id = store.insert(candidate(`/bg/notes-${i}.txt`, "doc"));
      store.addSegment({
        file: id,
        kind: "chunk",
        modality: "text",
        loc: 1,
        text: `lorem ipsum ${i}`,
        vector: fakeVector(`text ${i}`),
      });
    }
    for (let i = 0; i < 25; i++) {
      const id = store.insert(candidate(`/bg/photo-${i}.jpg`, "image"));
      store.addSegment({ file: id, kind: "image", modality: "image", vector: fakeVector(`image ${i}`) });
    }
    add("/docs/walk.txt", "doc", [
      {
        kind: "chunk",
        modality: "text",
        cosine: 0.05,
        loc: 1,
        text: "The zebra crossing on Main Street is busy.",
        excerpt: "The zebra crossing on Main Street is busy.",
      },
      {
        kind: "chunk",
        modality: "text",
        cosine: 0.6,
        loc: 2,
        text: "Animals at the zoo, striped ones too.",
        excerpt: "Animals at the zoo",
      },
    ]);
    add("/pics/stripes.jpg", "image", [{ kind: "image", modality: "image", cosine: 0.6 }]);
    add("/docs/street.txt", "doc", [
      {
        kind: "chunk",
        modality: "text",
        cosine: 0.0,
        loc: 1,
        text: "Ask the crossing guard about the school.",
        excerpt: "Ask the crossing guard",
      },
    ]);
    add("/docs/weak.txt", "doc", [
      { kind: "chunk", modality: "text", cosine: 0.1, loc: 1, text: "A grocery list.", excerpt: "A grocery list." },
    ]);
    add("/shots/zoo.png", "screenshot", [
      { kind: "image", modality: "image", cosine: 0.45 },
      { kind: "ocr", modality: "text", text: "Zebra exhibit opens Monday" },
    ]);
    add("/pics/zebra.jpg", "image", [{ kind: "image", modality: "image", cosine: -0.1 }]);
    add("/clips/safari.mov", "video", [
      { kind: "frame", modality: "image", cosine: 0.12, loc: 0 },
      { kind: "frame", modality: "image", cosine: 0.5, loc: 3 },
      { kind: "audio", modality: "audio", cosine: 0.2, loc: 0 },
    ]);
    searcher = new Searcher(store);
  });

  /** z per segment, computed here from the stored halves: per-modality levels (20+ rows) and one deviation. */
  function expectedZ(): Map<number, number> {
    const rows = store.all("SELECT id, modality, vec FROM segments WHERE vec IS NOT NULL ORDER BY id");
    const cosine = rows.map((row) => Math.fround(dot(decodeVector(row.vec as Uint8Array), query)));
    const modality = rows.map((row) => row.modality as string);
    const all = cosine.reduce((a, b) => a + b, 0) / cosine.length;
    const level = new Map<string, number>();
    for (const each of new Set(modality)) {
      const mine = cosine.filter((_, i) => modality[i] === each);
      level.set(each, mine.length >= 20 ? mine.reduce((a, b) => a + b, 0) / mine.length : all);
    }
    const centered = cosine.map((value, i) => value - level.get(modality[i])!);
    const mean = centered.reduce((a, b) => a + b, 0) / centered.length;
    const deviation = Math.max(Math.sqrt(centered.reduce((a, b) => a + (b - mean) ** 2, 0) / centered.length), 0.02);
    return new Map(rows.map((row, i) => [Number(row.id), (centered[i] - mean) / deviation]));
  }

  test("vectors load in segment order; a blob that isn't 768 halves is skipped", () => {
    assert.ok(searcher.vectorsLoaded);
    assert.equal(searcher.vectorCount, 30 + 25 + 2 + 1 + 1 + 1 + 1 + 1 + 3);
  });

  test("meaning and words fuse; the gate keeps what doesn't stand out away; one hit per file", () => {
    const hits = searcher.search("zebra crossing", query);
    const byPath = new Map(hits.map((hit) => [hit.path, hit]));
    assert.equal(byPath.size, hits.length);
    assert.deepEqual(
      hits.map((hit) => hit.path),
      [
        "/docs/walk.txt",
        "/pics/stripes.jpg",
        "/shots/zoo.png",
        "/clips/safari.mov",
        "/docs/street.txt",
        "/pics/zebra.jpg",
      ],
    );
    const z = expectedZ();
    const zOf = (path: string, kind: SegmentKind, loc: number | null = null) =>
      z.get(
        Number(store.get("SELECT id FROM segments WHERE file = ? AND kind = ? AND loc IS ?", ids[path], kind, loc)?.id),
      )!;
    // walk.txt: its best segment by meaning (chunk 2) stands out, and both words are in it: z + 2 × 1^1.5.
    const walk = byPath.get("/docs/walk.txt")!;
    assert.ok(Math.abs(walk.z! - zOf("/docs/walk.txt", "chunk", 2)) < 1e-6);
    assert.ok(walk.z! > 2);
    assert.ok(Math.abs(walk.cosine! - 0.6) < 0.005);
    assert.ok(Math.abs(walk.score - (walk.z! + 2)) < 1e-9);
    assert.deepEqual([walk.segment, walk.loc], ["chunk", 2]);
    // The words matched chunk 1, not the chunk pointed at: its stored excerpt, never another chunk's words.
    assert.equal(walk.excerpt, "Animals at the zoo");
    // By meaning alone.
    const stripes = byPath.get("/pics/stripes.jpg")!;
    assert.deepEqual([stripes.segment, stripes.keywordRank, stripes.excerpt], ["image", null, null]);
    assert.ok(Math.abs(stripes.score - stripes.z!) < 1e-9);
    // A screenshot's picture stands out and its OCR has one of the two words: z + 2 × 0.5^1.5, the OCR's words shown.
    const zoo = byPath.get("/shots/zoo.png")!;
    assert.equal(zoo.segment, "image");
    assert.ok(Math.abs(zoo.score - (zoo.z! + 2 * 0.5 ** 1.5)) < 1e-9);
    assert.equal(zoo.excerpt, "«Zebra» exhibit opens Monday");
    // A video: its best frame (3 s), not the first one.
    const safari = byPath.get("/clips/safari.mov")!;
    assert.deepEqual([safari.segment, safari.loc], ["frame", 3]);
    assert.ok(Math.abs(safari.z! - zOf("/clips/safari.mov", "frame", 3)) < 1e-6);
    // Half the words, no meaning: in by words, pointing at the segment the words matched, quoted.
    const street = byPath.get("/docs/street.txt")!;
    assert.ok(street.z! < 2);
    assert.ok(Math.abs(street.score - 2 * 0.5 ** 1.5) < 1e-9);
    assert.deepEqual([street.segment, street.loc], ["chunk", 1]);
    assert.equal(street.excerpt, "Ask the «crossing» guard about the school.");
    // Matched by its name only: no words to quote from its folder, no excerpt of its own.
    const zebra = byPath.get("/pics/zebra.jpg")!;
    assert.deepEqual([zebra.segment, zebra.excerpt], ["name", null]);
    // Below the gate and without the words: not a hit, though it's closer than street.txt by meaning.
    assert.ok(!byPath.has("/docs/weak.txt"));
    assert.ok(
      z.get(
        Number(store.get("SELECT id FROM segments WHERE file = ? AND kind = 'chunk'", ids["/docs/weak.txt"])?.id),
      )! < 2,
    );
  });

  test("a stricter gate drops meaning matches; a looser one lets weak ones in", () => {
    const strict = searcher.search("zebra crossing", query, { zGate: 100 }).map((hit) => hit.path);
    assert.deepEqual(strict, ["/docs/walk.txt", "/shots/zoo.png", "/docs/street.txt", "/pics/zebra.jpg"]);
    const loose = searcher.search("zebra crossing", query, { zGate: 0 }).map((hit) => hit.path);
    assert.ok(loose.includes("/docs/weak.txt"));
  });

  test("a kind the query names adds 1; a kind filter keeps z on the scale of all vectors", () => {
    const plain = searcher.search("zebra crossing", query);
    const hinted = searcher.search("zebra crossing video", query); // "video" is a stopword and a kind word
    const score = (hits: typeof plain, path: string) => hits.find((hit) => hit.path === path)!.score;
    assert.ok(Math.abs(score(hinted, "/clips/safari.mov") - score(plain, "/clips/safari.mov") - 1) < 1e-9);
    assert.equal(score(hinted, "/pics/stripes.jpg"), score(plain, "/pics/stripes.jpg"));
    const images = searcher.search("zebra crossing", query, { kinds: ["image"] });
    assert.deepEqual(
      images.map((hit) => hit.path),
      ["/pics/stripes.jpg", "/pics/zebra.jpg"],
    );
    assert.equal(images[0].z, plain.find((hit) => hit.path === "/pics/stripes.jpg")!.z);
    assert.equal(images[1].keywordRank, 1); // ranked among the files the filter keeps
  });

  test("limit, and ties broken by the smaller file id", () => {
    assert.equal(searcher.search("zebra crossing", query, { limit: 2 }).length, 2);
    const words = searcher.search("zebra crossing", null);
    // Without a query vector: words only. street, zoo and zebra.jpg each have half the words: by file id.
    assert.deepEqual(
      words.map((hit) => hit.path),
      ["/docs/walk.txt", "/docs/street.txt", "/shots/zoo.png", "/pics/zebra.jpg"],
    );
    assert.equal(words[0].excerpt, "The «zebra» «crossing» on Main Street is busy.");
    assert.ok(words.every((hit) => hit.z === null && hit.cosine === null));
    // A query vector of the wrong size is no query vector: a shorter one, or one with the right start and more.
    const longer = new Float32Array(DIMENSION + 32);
    longer.set(query);
    for (const wrong of [new Float32Array(10), longer]) {
      const hits = searcher.search("zebra crossing", wrong);
      assert.deepEqual(
        hits.map((hit) => hit.path),
        words.map((hit) => hit.path),
      );
      assert.ok(hits.every((hit) => hit.z === null));
    }
  });

  test("released vectors come back with the next meaning search; keyword search works without them", () => {
    searcher.release();
    assert.ok(!searcher.vectorsLoaded);
    assert.equal(searcher.vectorCount, 0);
    assert.equal(searcher.search("zebra crossing", null).length, 4);
    assert.ok(!searcher.vectorsLoaded);
    assert.equal(searcher.search("zebra crossing", query)[0].path, "/docs/walk.txt");
    assert.ok(searcher.vectorsLoaded);
  });

  test("later pages of long files and a vector of the wrong size don't move the scale", () => {
    const before = searcher.search("zebra crossing", query);
    // A 60-page PDF's pages past 30, a document's chunks past 40, and a blob that isn't 1,536 bytes.
    const book = add("/docs/book.pdf", "pdf", [], { pages: "60" });
    for (let page = 31; page <= 60; page++) {
      store.addSegment({
        file: book,
        kind: "page",
        modality: "text",
        loc: page,
        vector: aligned(query, 0.3, `page ${page}`),
      });
    }
    const long = add("/docs/long.docx", "doc", []);
    store.addSegment({
      file: long,
      kind: "chunk",
      modality: "text",
      loc: 41,
      vector: aligned(query, -0.4, "chunk 41"),
    });
    store.addSegment({ file: long, kind: "chunk", modality: "text", loc: 42, vector: new Array(10).fill(0.1) });
    searcher.reload();
    assert.equal(searcher.vectorCount, 65 + 30 + 1);
    const after = searcher.search("zebra crossing", query);
    for (const hit of before) {
      const same = after.find((other) => other.path === hit.path)!;
      assert.ok(Math.abs((same.z ?? 0) - (hit.z ?? 0)) < 1e-9, hit.path);
    }
    // Scored on the same scale: the book's pages stand out too.
    assert.ok(after.some((hit) => hit.path === "/docs/book.pdf" && hit.segment === "page" && hit.loc! > 30));
    // Page 30 of a short PDF does set the scale.
    const short = add("/docs/short.pdf", "pdf", [], { pages: "40" });
    store.addSegment({ file: short, kind: "page", modality: "text", loc: 31, vector: aligned(query, 0.9, "short 31") });
    searcher.reload();
    const moved = searcher.search("zebra crossing", query).find((hit) => hit.path === "/pics/stripes.jpg")!;
    assert.ok(Math.abs(moved.z! - before.find((hit) => hit.path === "/pics/stripes.jpg")!.z!) > 1e-3);
  });
});

describe("appending new vectors", () => {
  test("reads only what indexing added, in chunks of their own, and searches as a full reload does", () => {
    const store = freshStore();
    const add = (name: string) => {
      const file = store.insert(candidate(`/Users/someone/notes/${name}.txt`, "doc"));
      store.addSegment({ file, kind: "chunk", modality: "text", loc: 1, text: name, vector: fakeVector(name) });
      store.finish(file, "done");
    };
    store.transaction(() => {
      for (let i = 0; i < 1020; i++) add(`first ${i}`);
    });
    const searcher = new Searcher(store);
    assert.equal(searcher.vectorCount, 1020);
    // Added in steps, past the 1,024 rows the first read made room for: the later ones go to new chunks.
    for (let step = 0; step < 4; step++) {
      store.transaction(() => {
        for (let i = 0; i < 300; i++) add(`step ${step} file ${i}`);
      });
      assert.equal(searcher.appendNew(), 300);
    }
    assert.equal(searcher.appendNew(), 0);
    assert.equal(searcher.vectorCount, 2220);
    const fresh = new Searcher(store);
    for (const query of ["first 1019", "step 0 file 3", "step 3 file 299", "first 7"]) {
      const appended = searcher.search(query, fakeVector(query));
      assert.deepEqual(appended, fresh.search(query, fakeVector(query)), query);
      assert.equal(appended[0].path, `/Users/someone/notes/${query}.txt`);
    }
    // Released, it reads nothing until loaded again.
    searcher.release();
    add("after release");
    assert.equal(searcher.appendNew(), 0);
    searcher.reload();
    assert.equal(searcher.vectorCount, 2221);
  });
});

describe("search details, on synthetic vectors", () => {
  const query = fakeVector("zebra crossing");

  /** A store with 30 text and 25 image vectors unrelated to the query, so each modality has a level of its own. */
  function withBackground(): Store {
    const store = freshStore();
    for (let i = 0; i < 30; i++) {
      const id = store.insert(candidate(`/bg/notes-${i}.txt`, "doc"));
      store.addSegment({ file: id, kind: "chunk", modality: "text", loc: 1, vector: fakeVector(`text ${i}`) });
    }
    for (let i = 0; i < 25; i++) {
      const id = store.insert(candidate(`/bg/photo-${i}.jpg`, "image"));
      store.addSegment({ file: id, kind: "image", modality: "image", vector: fakeVector(`image ${i}`) });
    }
    return store;
  }

  function addPicture(store: Store, path: string, cosine: number): number {
    const id = store.insert(candidate(path, "image"));
    store.addSegment({ file: id, kind: "image", modality: "image", vector: aligned(query, cosine, path) });
    return id;
  }

  test("two segments of a file equally close: the one stored first is the hit", () => {
    const store = withBackground();
    const id = store.insert(candidate("/clips/twins.mov", "video"));
    const vector = aligned(query, 0.6, "twins");
    const first = store.addSegment({ file: id, kind: "frame", modality: "image", loc: 3, vector });
    store.addSegment({ file: id, kind: "frame", modality: "image", loc: 9, vector });
    const [hit] = new Searcher(store).search("", query);
    assert.deepEqual([hit.path, hit.segmentId, hit.loc], ["/clips/twins.mov", first, 3]);
  });

  test("a query vector of the wrong size finds nothing by meaning", () => {
    const store = withBackground();
    addPicture(store, "/pics/stripes.jpg", 0.6);
    const searcher = new Searcher(store);
    assert.equal(searcher.search("", query)[0]?.path, "/pics/stripes.jpg");
    const longer = new Float32Array(DIMENSION + 32);
    longer.set(query);
    assert.deepEqual(searcher.search("", longer), []);
    assert.deepEqual(searcher.search("", query.subarray(0, 10)), []);
  });

  test("a file whose z is just at the gate is in", () => {
    const store = withBackground();
    addPicture(store, "/pics/stripes.jpg", 0.6);
    const searcher = new Searcher(store);
    const [hit] = searcher.search("", query);
    assert.deepEqual(
      searcher.search("", query, { zGate: hit.z! }).map((each) => each.path),
      ["/pics/stripes.jpg"],
    );
  });

  test("a long PDF's page 30 and a document's chunk 40 set the scale; page 31 and chunk 41 don't", () => {
    const store = withBackground();
    addPicture(store, "/pics/stripes.jpg", 0.6);
    const book = store.insert(candidate("/docs/book.pdf", "pdf"));
    store.finish(book, "partial", null, { pages: "60" }); // more than 50 pages: read 30 at a time
    const notes = store.insert(candidate("/docs/notes.docx", "doc"));
    const searcher = new Searcher(store);
    const stripes = () => {
      searcher.reload();
      return searcher.search("", query).find((hit) => hit.path === "/pics/stripes.jpg")!.z!;
    };
    let before = stripes();
    const steps: Array<[number, SegmentKind, number, boolean]> = [
      [book, "page", 31, false],
      [book, "page", 30, true],
      [notes, "chunk", 41, false],
      [notes, "chunk", 40, true],
    ];
    for (const [file, kind, loc, setsScale] of steps) {
      store.addSegment({ file, kind, modality: "text", loc, vector: aligned(query, 0.9, `${kind} ${loc}`) });
      const after = stripes();
      if (setsScale) assert.ok(Math.abs(after - before) > 1e-3, `${kind} ${loc} sets the scale`);
      else assert.equal(after, before, `${kind} ${loc} doesn't`);
      before = after;
    }
  });

  test("a lookup with a query vector: meaning counts half, words four times", () => {
    const store = withBackground();
    const id = addPicture(store, "/shots/booking.png", 0.6);
    store.addSegment({ file: id, kind: "ocr", modality: "text", text: "Booking K7Q2LM confirmed" });
    const searcher = new Searcher(store);
    const [lookup] = searcher.search("K7Q2LM", query);
    assert.ok(lookup.z! > 2);
    assert.ok(Math.abs(lookup.score - (0.5 * lookup.z! + 4)) < 1e-9);
    const [words] = searcher.search("booking confirmed", query); // not a lookup
    assert.ok(Math.abs(words.score - (words.z! + 2)) < 1e-9);
  });

  test("20 vectors of a modality make a level of their own; 19 take the average of all", () => {
    const scores = [...Array<number>(30).fill(0.1), ...Array<number>(20).fill(0.9)];
    const modality: Modality[] = [...Array<Modality>(30).fill("text"), ...Array<Modality>(20).fill("audio")];
    assert.ok(Math.abs(Searcher.modalityMeans(scores, modality).get("audio")! - 0.9) < 1e-9);
    const fewer = Searcher.modalityMeans(scores.slice(0, 49), modality.slice(0, 49));
    assert.ok(Math.abs(fewer.get("audio")! - (30 * 0.1 + 19 * 0.9) / 49) < 1e-9);
  });

  test("a picture's hit quotes its file's OCR words, but never another page's or its folder's", () => {
    const store = withBackground();
    const pdf = store.insert(candidate("/docs/zoo.pdf", "pdf"));
    store.addSegment({ file: pdf, kind: "page", modality: "text", loc: 1, text: "Zebra feeding times" });
    store.addSegment({ file: pdf, kind: "page_image", modality: "image", loc: 2, vector: aligned(query, 0.6, "p2") });
    addPicture(store, "/Users/someone/Zebras/IMG_1.jpg", 0.6); // its folder holds the word, nothing else does
    const hits = new Map(new Searcher(store).search("zebra", query).map((hit) => [hit.path, hit]));
    const page = hits.get("/docs/zoo.pdf")!;
    assert.deepEqual([page.segment, page.loc, page.keywordRank !== null, page.excerpt], ["page_image", 2, true, null]);
    const picture = hits.get("/Users/someone/Zebras/IMG_1.jpg")!;
    assert.deepEqual([picture.segment, picture.keywordRank !== null, picture.excerpt], ["image", true, null]);
  });

  test("the vector source is read with the files", () => {
    const store = freshStore();
    const searcher = new Searcher(store, { loadVectors: false });
    assert.equal(searcher.vectorSource, null);
    store.setModel("embeddinggemma-2 | photo140", "embeddinggemma-2-Q8_0");
    assert.equal(searcher.vectorSource, null);
    searcher.reloadFiles();
    assert.equal(searcher.vectorSource, "embeddinggemma-2-Q8_0");
    assert.equal(new Searcher(store).vectorSource, "embeddinggemma-2-Q8_0");
  });
});

describe("code search (DigUp: CodeTests)", () => {
  /** A function of `body` lines, each `width` characters wide. */
  const fn = (name: string, body: number, width = 40) =>
    `func ${name}() {\n` +
    Array.from({ length: body }, (_, i) => `    let v${i + 1} = "${"x".repeat(width)}"`).join("\n") +
    "\n}\n";

  /** What the indexer stores for a code file: its stretches of lines, each with a vector, a summary and its text. */
  function addCode(store: Store, path: string, text: string): number {
    const id = store.insert(candidate(path, "code"));
    for (const piece of lines(text)) {
      store.addSegment({
        file: id,
        kind: "lines",
        modality: "text",
        loc: piece.first,
        locEnd: piece.last,
        excerpt: summary(piece.text),
        text: piece.text,
        vector: fakeVector(piece.text),
      });
    }
    store.finish(id, "done", null, { lines: "74" });
    return id;
  }

  test("a function's name finds its stretch (DigUp: codeIndexIsAFileOfItsOwn)", () => {
    const store = freshStore(true);
    addCode(
      store,
      "/repo/billing/retry.py",
      [fn("retryWithBackoff", 22), fn("circuit", 22), fn("other", 22)].join("\n"),
    );
    assert.deepEqual(
      store.all("SELECT loc FROM segments WHERE kind != 'name' ORDER BY loc").map((row) => row.loc),
      [1, 26, 51],
    );
    const searcher = new Searcher(store);
    assert.ok(searcher.isCode);
    const hits = searcher.search("retryWithBackoff", null);
    assert.deepEqual([hits[0]?.segment, hits[0]?.loc, hits[0]?.locEnd], ["lines", 1, 24]);
    assert.equal(hits[0].focus, 1); // the line that defines it
    assert.equal(hits[0].score, 2); // a name looked up: words × 2 in the code index
    assert.ok(hits[0].excerpt?.startsWith("func «retryWithBackoff»() { let v1 = ")); // FTS's 12-word snippet
  });

  test("a name looked up points at its definition, not its calls (DigUp: aNameLookedUpPointsAtItsDefinition)", () => {
    const store = freshStore(true);
    const calls =
      "func run() {\n" +
      Array.from({ length: 30 }, (_, i) => `    refreshAccessToken()  // call ${i + 1} of many`).join("\n") +
      "\n}\n";
    const definition = '\nfunc refreshAccessToken() -> String {\n    return "token"\n}\n';
    addCode(store, "/repo/app/Auth.swift", calls + definition);
    const searcher = new Searcher(store);
    const hit = searcher.search("refreshAccessToken", null)[0];
    assert.equal(hit.segment, "lines");
    assert.equal(hit.focus, 34); // the line that defines it, in the stretch that holds it
    assert.ok(hit.loc! <= 34 && hit.locEnd! >= 34);
    assert.equal(searcher.search("refreshAccessToken()", null)[0].focus, 34);
    // Words, not a name: the first line with them that defines something.
    const words = searcher.search("refresh token", null)[0];
    assert.equal(words.focus, 34);
    // In the main index the same text is not looked up as a name.
    assert.ok(!new Searcher(store, { code: false }).isCode);
  });

  /** 39 calls that fill a first stretch, then the function they call, in a second one. */
  const callsThenDefinition =
    "func run() {\n" +
    Array.from({ length: 39 }, (_, i) => `    refreshAccessToken()  // call ${i + 1} of many`).join("\n") +
    '\n}\n\nfunc refreshAccessToken() -> String {\n    return "token"\n}\n';

  test("a name looked up points at the stretch that defines it, when its calls fill another one", () => {
    const store = freshStore(true);
    const text = callsThenDefinition;
    const line = text.split("\n").indexOf("func refreshAccessToken() -> String {") + 1;
    assert.deepEqual(
      lines(text).map((piece) => piece.first),
      [1, line],
    ); // the calls fill the first stretch; the definition starts the second
    const id = addCode(store, "/repo/app/Auth.swift", text);
    const definition = Number(store.get("SELECT id FROM segments WHERE file = ? AND loc = ?", id, line)?.id);
    const hit = new Searcher(store).search("refreshAccessToken", null)[0];
    assert.deepEqual([hit.segmentId, hit.loc, hit.focus], [definition, line, line]);
  });

  test("a stretch found by meaning while the words matched another one opens at its first line", () => {
    const store = freshStore(true);
    for (let i = 0; i < 30; i++) {
      const id = store.insert(candidate(`/repo/other/file${i}.py`, "code"));
      store.addSegment({ file: id, kind: "lines", modality: "text", loc: 1, locEnd: 9, vector: fakeVector(`bg ${i}`) });
    }
    addCode(store, "/repo/app/Auth.swift", callsThenDefinition);
    const [, definition] = lines(callsThenDefinition);
    const searcher = new Searcher(store);
    // "call" fills the first stretch; meaning points at the second, which has "token" too.
    const hit = searcher.search("call token", fakeVector(definition.text))[0];
    assert.equal(hit.keywordRank, 1);
    assert.deepEqual([hit.path, hit.loc, hit.focus], ["/repo/app/Auth.swift", definition.first, null]);
    // Found by its words, the same stretch opens at the first line with them that defines something.
    const words = searcher.search("token", null)[0];
    assert.deepEqual([words.loc, words.focus], [definition.first, definition.first]);
  });
});
