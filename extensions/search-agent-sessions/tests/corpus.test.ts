import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  CHUNK_OVERLAP,
  MAX_LINE_CHARS,
  chunkMessage,
  reconcileCorpus,
} from "../src/lib/corpus";
import { corpusPath, setSupportPath } from "../src/lib/paths";

/** Distinct space-separated words, so overlaps are visible in the output. */
function words(count: number): string {
  return Array.from({ length: count }, (_, i) => `w${i}`).join(" ");
}

/** Like `words`, but every word ends in `x`, so a cut through one shows up. */
function markedWords(count: number): string {
  return Array.from({ length: count }, (_, i) => `w${i}x`).join(" ");
}

// Built from code points rather than literals: a raw NUL in this file would
// make grep and every other tool treat the test source itself as binary.
const NUL = String.fromCharCode(0x00);
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

/** Characters that would corrupt the tab-delimited corpus line format. */
const FORBIDDEN = ["\t", "\n", "\r", NUL, LINE_SEP, PARA_SEP];

function assertClean(line: string) {
  for (const c of FORBIDDEN) {
    const code = c.charCodeAt(0).toString(16);
    assert.ok(!line.includes(c), `line carries U+${code}`);
  }
}

test("a short message becomes exactly one line", () => {
  assert.deepEqual(chunkMessage("hello world"), ["hello world"]);
});

test("a whitespace-only message produces nothing", () => {
  assert.deepEqual(chunkMessage("  \n\t  "), []);
});

test("a long message is split into several lines", () => {
  const lines = chunkMessage(words(2000));
  assert.ok(lines.length > 1, `expected a split, got ${lines.length} line(s)`);
  for (const line of lines) assert.ok(line.length <= MAX_LINE_CHARS);
});

test("consecutive lines overlap", () => {
  const lines = chunkMessage(words(2000));
  for (let i = 0; i + 1 < lines.length; i++) {
    // The overlap is a fixed-size tail: the previous line must end with the
    // whole leading CHUNK_OVERLAP of the next, not just its first few chars.
    const head = lines[i + 1].slice(0, CHUNK_OVERLAP);
    assert.ok(
      head.length >= 50 && lines[i].endsWith(head),
      `line ${i} does not overlap line ${i + 1}`,
    );
  }
});

test("a phrase straddling a split lands whole on one line", () => {
  // The phrase sits just past the first cut, so only the overlap can keep it
  // intact on a single line.
  const filler = words(2000);
  const raw = `${filler.slice(0, MAX_LINE_CHARS - 20)} alpha beta ${filler}`;
  const lines = chunkMessage(raw);
  assert.ok(
    lines.some((l) => l.includes("alpha beta")),
    "no single line contains the straddling phrase",
  );
});

test("no word is lost across the splits", () => {
  // Splitting must partition the message, not sample it: a cut that skipped
  // ahead instead of overlapping would still satisfy every other case here.
  const total = 2000;
  const lines = chunkMessage(words(total));
  const seen = new Set(lines.flatMap((l) => l.split(" ")));
  for (let i = 0; i < total; i++) assert.ok(seen.has(`w${i}`), `lost w${i}`);
});

test("a split lands on a word boundary", () => {
  const lines = chunkMessage(markedWords(2000));
  assert.ok(lines.length > 1);
  // Only the last line ends where the message does; every earlier one ends at
  // a cut, and a cut through a word would drop that word's trailing `x`.
  for (const line of lines.slice(0, -1)) {
    assert.ok(line.endsWith("x"), `cut mid-word: ${line.slice(-12)}`);
  }
});

test("a message of exactly the line limit is one line", () => {
  const raw = "a".repeat(MAX_LINE_CHARS);
  assert.deepEqual(chunkMessage(raw), [raw]);
});

test("chunking terminates on text with no spaces", () => {
  const lines = chunkMessage("a".repeat(MAX_LINE_CHARS * 4 + 1));
  assert.ok(lines.length > 1);
  assert.ok(lines.length < 100, "chunking made too little progress");
  assert.ok(lines[lines.length - 1].endsWith("a"));
});

test("chunking terminates one char past the limit", () => {
  const lines = chunkMessage("a".repeat(MAX_LINE_CHARS + 1));
  assert.ok(lines.length >= 1 && lines.length < 10);
});

test("lines never carry tabs, newlines or control bytes", () => {
  // The corpus line format is `key<tab>seq<tab>text`, and a single NUL makes
  // ripgrep treat corpus.txt as binary and skip it entirely.
  const raw = `alpha\tbeta\ngamma\r\n${NUL}delta${LINE_SEP}epsilon${PARA_SEP}zeta`;
  const lines = chunkMessage(raw);
  assert.equal(lines.length, 1);
  assertClean(lines[0]);
  // The words survive as separate tokens rather than being welded together.
  for (const w of ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"]) {
    assert.ok(lines[0].includes(w), `lost ${w}`);
  }
});

test("long messages stay free of tabs and newlines", () => {
  const raw = `${words(2000)}\n${NUL}  ${words(2000)}${LINE_SEP}end`;
  const lines = chunkMessage(raw);
  assert.ok(lines.length > 1);
  for (const line of lines) assertClean(line);
});

const SUPPORT = mkdtempSync(join(tmpdir(), "corpus-"));
setSupportPath(SUPPORT);

/** Writes a corpus of `lines` whole lines and returns what it holds. */
function seedCorpus(lines: number): string {
  const text = Array.from({ length: lines }, (_, i) => `k${i}\t${i}\tline ${i}`)
    .map((l) => `${l}\n`)
    .join("");
  writeFileSync(corpusPath(), text);
  return text;
}

test("a corpus longer than the manifest recorded loses the extra tail", () => {
  // What a kill between the two writes leaves behind: lines whose offsets the
  // manifest never got to record, which the sessions they came from emit again.
  const text = seedCorpus(6);
  const committed = Buffer.byteLength(text.slice(0, text.indexOf("k4")));
  assert.equal(reconcileCorpus(committed), committed);
  assert.equal(statSync(corpusPath()).size, committed);
  // Truncated on a line boundary, so what survives is still parseable.
  const kept = readFileSync(corpusPath(), "utf8");
  assert.ok(kept.endsWith("line 3\n"));
  assert.ok(!kept.includes("line 4"));
});

test("a corpus of exactly the recorded length is left alone", () => {
  const text = seedCorpus(6);
  const bytes = Buffer.byteLength(text);
  assert.equal(reconcileCorpus(bytes), bytes);
  assert.equal(readFileSync(corpusPath(), "utf8"), text);
});

test("a corpus shorter than the manifest recorded demands a rebuild", () => {
  // Nothing appends the missing lines back: the sessions that produced them are
  // recorded as fully indexed.
  const text = seedCorpus(6);
  assert.equal(reconcileCorpus(Buffer.byteLength(text) + 1), null);
});

test("a missing corpus demands a rebuild", () => {
  setSupportPath(mkdtempSync(join(tmpdir(), "corpus-empty-")));
  try {
    assert.equal(reconcileCorpus(0), null);
  } finally {
    setSupportPath(SUPPORT);
  }
});
