// Ported from DigUp's RulesTests.swift (HTML, chunks) and LongFilesTests.swift (a long document's chunks), plus the
// text-file decoding and the docx/odt reader of Docs+Portable.swift. Expected values were checked against DigUp's own
// Swift on macOS 26.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, describe, test } from "node:test";
import { deflateRawSync } from "node:zlib";
import { graphemeCount } from "../engine/searchtext";
import {
  ExtractError,
  chunks,
  decodeText,
  docxText,
  excerpt,
  odtText,
  plainTextFromHTML,
  stripMarkup,
  readText,
} from "../engine/text";

const folder = mkdtempSync(join(tmpdir(), "dig-up-text-"));
after(() => rmSync(folder, { recursive: true, force: true }));

/** LongFilesTests' prose: words from a small list, a period now and then. */
function prose(characters: number, seed = 1): string {
  const words = [
    "river",
    "garden",
    "morning",
    "letter",
    "window",
    "harbour",
    "kitchen",
    "mountain",
    "station",
    "market",
    "evening",
    "bridge",
    "orchard",
    "lantern",
    "meadow",
    "village",
    "library",
    "summer",
  ];
  const pieces: string[] = [];
  let count = 0;
  let index = seed;
  while (count < characters) {
    index = (Math.imul(index, 1103515245) + 12345) & 0x7fffffff;
    const piece = words[index % words.length] + (index % 7 === 0 ? "." : "");
    pieces.push(piece);
    count += piece.length + 1;
  }
  return pieces.join(" ");
}

describe("HTML", () => {
  test("becomes plain text", () => {
    const html = `<html><head><title>T</title><style>p { color: red }</style></head>
<body><h1>Trip &amp; plans</h1><p>Fly to <b>Tokyo</b>&nbsp;on Friday.</p><script>var x = 1;</script>
<p>Caf&#233; &#x2014; ramen</p><!-- hidden --></body></html>`;
    assert.equal(plainTextFromHTML(html), "Trip & plans\nFly to Tokyo on Friday.\nCafé — ramen");
  });

  test("blocks, scripts and line breaks", () => {
    assert.equal(
      plainTextFromHTML("<ul><li>one</li><li>two</li></ul>\r\n\r\n<br/>three&nbsp;&nbsp;four"),
      "one\ntwo\nthree four",
    );
    assert.equal(
      plainTextFromHTML("<SCRIPT type=x>alert(1)</SCRIPT >keep<scripts>this</scripts><style\n>p{}</style>"),
      "keep this",
    );
  });

  test("drops scripts, styles, comments and heads as DigUp's lazy patterns do", () => {
    // DigUp's patterns as regexes: the linear scans must replace exactly what they do.
    const end = String.raw`(?![\p{Alphabetic}\p{M}\p{Nd}\p{Pc}\u200c\u200d])`;
    const lazy = [
      new RegExp(String.raw`<script${end}.*?</script\p{White_Space}*>`, "gisu"),
      new RegExp(String.raw`<style${end}.*?</style\p{White_Space}*>`, "gisu"),
      /<!--.*?-->/gsu,
      new RegExp(String.raw`<head${end}.*?</head\p{White_Space}*>`, "gisu"),
    ];
    const blockEnds = new RegExp(String.raw`<(?:br|/p|/div|/li|/h[1-6]|/tr|/section|/article)${end}[^>]*>`, "giu");
    const reference = (html: string) =>
      lazy
        .reduce((text, pattern) => text.replace(pattern, " "), html)
        .replace(blockEnds, "\n")
        .replace(/<[^>]+>/gu, " ");
    const tokens = [
      "<script>",
      "<SCRIPT type=x>",
      "</script>",
      "</ScRiPt \n>",
      "<scripts>",
      "<style>",
      "</style>",
      "<!--",
      "-->",
      "<!-->",
      "<head>",
      "</head >",
      "<p>",
      "</p>",
      "</p",
      "<br>",
      "<br/",
      "<BR",
      "<brx>",
      "<>",
      "a",
      "word ",
      "\n",
      "&amp;",
      "<",
      ">",
      "-",
      "<ſcript>",
      "</ſcript>",
      "é",
    ];
    let seed = 7;
    const random = (n: number) => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff), seed % n);
    for (let i = 0; i < 2000; i++) {
      const html = Array.from({ length: 1 + random(30) }, () => tokens[random(tokens.length)]).join("");
      assert.equal(stripMarkup(html), reference(html), JSON.stringify(html));
    }
  });

  test("an opener that's never closed costs a scan, not a scan per opener", () => {
    // 500 KB of unclosed comments took 27 s with the lazy patterns.
    for (const html of [
      "<!--".repeat(100_000) + "text",
      "<script>".repeat(60_000),
      "<br".repeat(100_000),
      "<x".repeat(100_000),
    ]) {
      const began = performance.now();
      plainTextFromHTML(html);
      assert.ok(performance.now() - began < 1500, `${html.slice(0, 8)}…: ${Math.round(performance.now() - began)} ms`);
    }
  });

  test("entities: numeric ones, invalid ones, and one pass", () => {
    assert.equal(
      plainTextFromHTML("Caf&#233; &#x2014; [&#99999999999;] [&#xD800;] &#X41; &#0;x"),
      "Café — [ ] [ ] &#X41; \u0000x",
    );
    // DigUp replaces names in a dictionary's order, so "&amp;lt;" may come out as "<"; here it's always "&lt;".
    assert.equal(plainTextFromHTML("&amp;lt;b&amp;gt;"), "&lt;b&gt;");
    // Foundation's plain search doesn't split ";" from a combining mark after it.
    assert.equal(plainTextFromHTML("<p>a&mdash;́b</p>"), "a&mdash;́b");
    assert.equal(plainTextFromHTML("a&mdash;িb"), "a—িb");
  });
});

describe("chunks", () => {
  test("overlap and respect words", () => {
    const text = Array.from({ length: 600 }, (_, i) => `word${i + 1}`).join(" ");
    const pieces = chunks(text, 100, 500, 100);
    assert.ok(pieces.length > 5);
    assert.ok(pieces.every((chunk) => chunk.length <= 500));
    assert.ok(pieces.every((chunk) => chunk.startsWith("word"))); // never starts mid-word
    assert.ok(pieces.at(-1)?.endsWith("word600"));
  });

  test("a long document", () => {
    const pieces = chunks(prose(150_000), 10_000);
    assert.ok(pieces.length > 80);
    assert.ok(pieces.every((chunk) => chunk !== "" && chunk.length <= 1800));
    assert.equal(chunks(prose(150_000), 40).length, 40);
  });

  test("small windows, as DigUp cuts them", () => {
    const text = "alpha beta gamma delta epsilon zeta eta theta iota kappa";
    assert.deepEqual(chunks(text, 100, 20, 8), [
      "alpha beta gamma",
      "gamma delta",
      "delta epsilon zeta",
      "zeta eta theta",
      "theta iota kappa",
    ]);
    assert.deepEqual(chunks(text, 2, 20, 8), ["alpha beta gamma", "gamma delta"]);
  });

  test("count characters, not UTF-16 units", () => {
    const pieces = chunks("কলকাতায় বৃষ্টি হচ্ছে আজ সারাদিন ধরে", 100, 12, 4);
    assert.deepEqual(pieces, ["কলকাতায় বৃষ্টি হচ্ছে", "হচ্ছে আজ সারাদিন", "ধরে"]);
    assert.ok(pieces.every((chunk) => graphemeCount(chunk) <= 12));
  });

  test("squeeze spaces and blank lines first", () => {
    assert.deepEqual(chunks("a\n \n \n b", 10), ["a\n\n b"]);
    assert.deepEqual(chunks("one  two\t\tthree\n\n\n\n\nfour", 10), ["one two three\n\nfour"]);
    assert.deepEqual(chunks(" \n\t ", 10), []);
  });

  test("stacked consonants count as Swift counts them", () => {
    // Swift starts a new Character at a consonant stacked under a Khmer coeng; ICU doesn't (checked against DigUp).
    const khmer =
      "\u1781\u17d2\u1798\u17c2\u179a \u1780\u17d2\u179a\u17bb\u1784 \u179f\u17d2\u179a\u17b8 \u1780\u17d2\u1780 \u1781\u17d2\u1789\u17bb\u17c6";
    assert.deepEqual(chunks(khmer, 100, 3, 1), [
      "\u1781\u17d2\u1798\u17c2\u179a",
      "\u1780\u17d2\u179a\u17bb",
      "\u1784 \u179f\u17d2",
      "\u179a\u17b8 \u1780\u17d2",
      "\u1780 \u1781\u17d2",
      "\u1789\u17bb\u17c6",
    ]);
    assert.equal(excerpt("x" + khmer, 2), "x\u1781\u17d2\u2026");
  });

  test("a long text costs what its first chunks cost", () => {
    // 8 MB of prose and an emoji at the end: the emoji made every call split the whole text into characters.
    const text = prose(8_000_000) + " \u{1F44D}";
    const start = performance.now();
    const first = chunks(text, 5);
    assert.ok(performance.now() - start < 1000, `took ${performance.now() - start} ms`);
    assert.deepEqual(first, chunks(text.slice(0, 50_000), 5));
  });

  test("the first chunks are the whole text's first chunks", () => {
    // Small windows, so the start of the text is taken, found short and taken again many times. Marks, emoji, CR LF
    // and runs of white space sit where a cut could fall.
    const alphabet = [
      "a",
      "b",
      "c",
      " ",
      "  ",
      "\n",
      "\n\n\n",
      "\t",
      "\r\n",
      "\u00a0",
      "\u200b",
      "e\u0301",
      "\u{1F44D}",
      "\u0995\u09cd\u09b7",
      "\u1780\u17d2\u1780",
      "\u2003",
    ];
    let seed = 7;
    const next = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff);
    for (let round = 0; round < 200; round++) {
      const text = Array.from({ length: 20 + (next() % 300) }, () => alphabet[next() % alphabet.length]).join("");
      const all = chunks(text, Infinity, 7, 3);
      for (const limit of [1, 2, 3, 5, 8]) {
        assert.deepEqual(chunks(text, limit, 7, 3), all.slice(0, limit), JSON.stringify(text));
      }
    }
  });
});

describe("excerpts", () => {
  test("one line, at most `limit` characters", () => {
    assert.equal(excerpt("  a \n\t b  "), "a b");
    assert.equal(excerpt("word ".repeat(100), 20), "word word word word …");
    // Only the first limit × 8 characters are looked at; more text after them still earns the "…".
    assert.equal(excerpt(" ".repeat(2000) + "x"), "…");
  });
});

describe("text files", () => {
  const decode = (bytes: number[]) => decodeText(Uint8Array.from(bytes));

  test("decode as Foundation does on macOS", () => {
    assert.equal(decode([0xef, 0xbb, 0xbf, 0x68, 0x69]), "hi"); // UTF-8, its BOM dropped
    assert.equal(decode([0x68, 0xc3, 0xa9]), "hé");
    assert.equal(decode([0xff, 0xfe, 0x68, 0, 0x69, 0]), "hi"); // UTF-16 LE
    assert.equal(decode([0xfe, 0xff, 0, 0x68, 0, 0x69]), "hi"); // UTF-16 BE
    assert.equal(decode([0xff, 0xfe, 0, 0, 0x68, 0, 0, 0]), "h"); // UTF-32 LE
    assert.equal(decode([0xff, 0xfe, 0x3d, 0xd8, 0, 0xde]), "\u{1F600}");
    assert.equal(decode([]), "");
    assert.equal(decode([0x68, 0, 0x69, 0]), "h\u0000i\u0000"); // no BOM: valid UTF-8
  });

  test("text too big for a string is unreadable, not a RangeError", () => {
    const tooBig = (error: unknown) =>
      error instanceof ExtractError && error.message === "unreadable: too big to read as text";
    // About 537 MB: one more character than V8's longest string.
    assert.throws(() => decodeText(Buffer.alloc(0x1fffffe8 + 1, 0x61)), tooBig);
    // Over 2 GB can't be read at once; a sparse file takes no space.
    const huge = join(folder, "huge.txt");
    writeFileSync(huge, "");
    truncateSync(huge, 2 ** 31 + 1);
    assert.throws(() => readText(huge), tooBig);
  });

  test("anything that doesn't decode is Latin-1, whole", () => {
    assert.equal(decode([0x63, 0x61, 0x66, 0xe9]), "café");
    assert.equal(decode([0, 0, 0xfe, 0xff, 0, 0, 0, 0x68]), "\u0000\u0000þÿ\u0000\u0000\u0000h"); // UTF-32 BE isn't read
    assert.equal(decode([0xff, 0xfe, 0x68, 0, 0x69]), "ÿþh\u0000i"); // odd length
    assert.equal(decode([0xff, 0xfe, 0, 0xd8, 0x69, 0]), "ÿþ\u0000Øi\u0000"); // a lone surrogate
    assert.equal(decode([0xef, 0xbb, 0xbf, 0x68, 0xff]), "ï»¿hÿ"); // the BOM stays
    assert.equal(decode([0xed, 0xa0, 0x80]), "í \u0080"); // an encoded surrogate isn't UTF-8
  });
});

describe("docx and odt", () => {
  /** A zip file of these entries, the first stored, the rest deflated. */
  function zip(entries: Record<string, string>): Buffer {
    const locals: Buffer[] = [];
    const central: Buffer[] = [];
    let offset = 0;
    Object.entries(entries).forEach(([name, text], i) => {
      const raw = Buffer.from(text);
      const data = i === 0 ? raw : deflateRawSync(raw);
      const nameBytes = Buffer.from(name);
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(i === 0 ? 0 : 8, 8);
      local.writeUInt32LE(data.length, 18);
      local.writeUInt32LE(raw.length, 22);
      local.writeUInt16LE(nameBytes.length, 26);
      const entry = Buffer.alloc(46);
      entry.writeUInt32LE(0x02014b50, 0);
      entry.writeUInt16LE(i === 0 ? 0 : 8, 10);
      entry.writeUInt32LE(data.length, 20);
      entry.writeUInt32LE(raw.length, 24);
      entry.writeUInt16LE(nameBytes.length, 28);
      entry.writeUInt32LE(offset, 42);
      locals.push(local, nameBytes, data);
      central.push(entry, nameBytes);
      offset += 30 + nameBytes.length + data.length;
    });
    const directory = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(Object.keys(entries).length, 8);
    end.writeUInt16LE(Object.keys(entries).length, 10);
    end.writeUInt32LE(directory.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, directory, end]);
  }

  test("a docx file's words", () => {
    const xml =
      '<?xml version="1.0"?><w:document><w:body><w:p><w:pPr><w:tabs><w:tab w:val="left"/></w:tabs></w:pPr>' +
      "<w:r><w:t>Hello</w:t></w:r><w:r><w:tab/><w:t>world &amp; more</w:t></w:r></w:p>" +
      "<w:p><w:r><w:t>Line</w:t><w:br/><w:t>two</w:t></w:r></w:p></w:body></w:document>";
    const file = join(folder, "a.docx");
    writeFileSync(file, zip({ "[Content_Types].xml": "<Types/>", "word/document.xml": xml }));
    assert.equal(docxText(file), "Hello world & more\nLine\ntwo");
  });

  test("an odt file's words", () => {
    const xml =
      "<office:document-content><office:body><office:text><text:p>One<text:tab/>two</text:p><text:h>Head</text:h>" +
      "<text:p>a<text:line-break/>b<text:s/>c</text:p></office:text></office:body></office:document-content>";
    const file = join(folder, "a.odt");
    writeFileSync(file, zip({ mimetype: "application/vnd.oasis.opendocument.text", "content.xml": xml }));
    assert.equal(odtText(file), "One two\nHead\na\nb c");
  });

  test("DigUp's reasons when it can't", () => {
    const notZip = join(folder, "not.docx");
    writeFileSync(notZip, "plain text");
    assert.throws(
      () => docxText(notZip),
      (error) => error instanceof ExtractError && error.message === "unreadable: not a zip file",
    );
    const empty = join(folder, "empty.odt");
    writeFileSync(empty, zip({ mimetype: "x" }));
    assert.throws(() => odtText(empty), { message: "unreadable: no content.xml inside" });
  });

  test("the testbed's docx reads as the Cocoa text system reads it", (t) => {
    const file = resolve(".testbed/synthetic/docs/Vector search notes.docx");
    if (!existsSync(file)) return t.skip("no .testbed (it isn't checked in)");
    assert.equal(
      docxText(file),
      "Notes on implementing cosine similarity search over embedding vectors with Accelerate in Swift: normalize " +
        "vectors, use cblas_sgemv, keep the top-k with a heap.",
    );
  });
});

describe("ExtractError", () => {
  test("describes itself as DigUp does", () => {
    assert.equal(ExtractError.unreadable("not a notebook").message, "unreadable: not a notebook");
    assert.equal(ExtractError.tooSmall(120, 80).message, "small image 120×80");
    assert.equal(ExtractError.locked().message, "password-protected");
    assert.equal(ExtractError.empty("no text").message, "no text");
    const leftOut = ExtractError.leftOut("not text");
    assert.deepEqual([leftOut.kind, leftOut.message], ["leftOut", "not text"]);
  });
});
