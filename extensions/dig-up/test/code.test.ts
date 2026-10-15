// Ported from DigUp's CodeTests.swift (the parts that need no index or crawl: stretches, notebooks, what's left out
// once read, place, names), plus the reading rules of CodeExtractor.read.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, describe, test } from "node:test";
import {
  LONGEST_PIECE,
  cells,
  check,
  definition,
  firstLine,
  identifier,
  language,
  lineCount,
  lines,
  notebookCells,
  phrase,
  place,
  readCode,
  summary,
} from "../engine/code";
import { ExtractError } from "../engine/text";
import { DEFAULT_OPTIONS } from "../engine/types";

const folder = mkdtempSync(join(tmpdir(), "dig-up-code-"));
after(() => rmSync(folder, { recursive: true, force: true }));

function write(path: string, body: string | Uint8Array): string {
  const file = join(folder, path);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, body);
  return file;
}

/** A function of `body` lines, each `width` characters wide. */
function fn(name: string, body: number, width = 40): string {
  const lines = Array.from({ length: body }, (_, i) => `    let v${i + 1} = "${"x".repeat(width)}"`);
  return `func ${name}() {\n${lines.join("\n")}\n}\n`;
}

/** The message `run` throws, as DigUp describes it. */
function leftOut(run: () => unknown): string | null {
  try {
    run();
    return null;
  } catch (error) {
    assert.ok(error instanceof ExtractError);
    return error.message;
  }
}

describe("stretches of lines", () => {
  test("a short file is one stretch", () => {
    assert.deepEqual(lines("import Foundation\n\nfunc a() {}\n", 1800), [
      { text: "import Foundation\n\nfunc a() {}", first: 1, last: 3 },
    ]);
  });

  test("stretches end where the code does", () => {
    // Three functions of ~25 lines (~1,000 characters each): a 1,800-character stretch can't hold two, and must end
    // at the blank line between them rather than in the middle of the second.
    const text = [fn("first", 22), fn("second", 22), fn("third", 22)].join("\n");
    const pieces = lines(text, 1800);
    assert.equal(pieces.length, 3);
    assert.deepEqual(
      pieces.map((piece) => piece.text.split("\n")[0]),
      ["func first() {", "func second() {", "func third() {"],
    );
    for (const piece of pieces) assert.ok(piece.text.endsWith("}"));
    // Line numbers are the file's, from 1, and stretches don't overlap when they end at a break.
    assert.deepEqual([pieces[0].first, pieces[0].last], [1, 24]);
    assert.deepEqual([pieces[1].first, pieces[1].last], [26, 49]);
    const all = text.split("\n");
    for (const piece of pieces) {
      assert.equal(all.slice(piece.first - 1, piece.last).join("\n"), piece.text);
      assert.ok(piece.text.length <= 1800);
    }
  });

  test("a block too long for one stretch overlaps by two lines", () => {
    const pieces = lines(fn("huge", 100), 1800);
    assert.ok(pieces.length > 2);
    for (let i = 1; i < pieces.length; i++) assert.equal(pieces[i].first, pieces[i - 1].last - 1); // the last two again
    assert.equal(pieces.at(-1)?.last, 102);
  });

  test("a very long line is cut for the model", () => {
    const pieces = lines("let a = 1\n" + "y".repeat(9000) + "\nlet b = 2\n", 1800);
    assert.deepEqual(
      pieces.map((piece) => piece.first),
      [1, 2, 3],
    );
    assert.equal(pieces[1].text.length, LONGEST_PIECE);
  });

  test("Windows line endings and blank edges", () => {
    assert.deepEqual(lines("\r\n\r\nfunc a() {\r\n}\r\n\r\n", 1800), [{ text: "func a() {\n}", first: 3, last: 4 }]);
  });

  test("sizes count characters as Swift does", () => {
    // 8 characters a line with its newline (15 UTF-16 units): 11 lines to a 90-character stretch, as in DigUp.
    const wide = "x = '\u{1F468}\u200d\u{1F469}\u200d\u{1F467}'\n".repeat(30);
    assert.deepEqual(
      lines(wide, 90).map((piece) => [piece.first, piece.last]),
      [
        [1, 11],
        [12, 22],
        [23, 30],
      ],
    );
  });

  test("closing lines stay with the block above", () => {
    const text = `${"a = 1\n".repeat(30)}end\n${"b = 2\n".repeat(30)}`;
    const pieces = lines(text, 120);
    assert.ok(pieces.every((piece) => !piece.text.startsWith("end")));
  });
});

describe("line counts", () => {
  test("count newlines, and a last line without one", () => {
    assert.equal(lineCount(""), 0);
    assert.equal(lineCount("a"), 1);
    assert.equal(lineCount("a\n"), 1);
    assert.equal(lineCount("a\nb"), 2);
    assert.equal(lineCount("a\r\n"), 2); // DigUp's hasSuffix("\n") is false after "\r\n"
  });
});

describe("notebooks", () => {
  function notebook(list: Array<[string, string]>, outputs = true): Buffer {
    const cellList = list.map(([kind, source]) => ({
      cell_type: kind,
      metadata: {},
      source: source.split("\n").map((line) => line + "\n"),
      ...(kind === "code" && outputs
        ? {
            outputs: [
              { output_type: "display_data", data: { "image/png": "A".repeat(5000), "text/plain": ["<Figure>"] } },
            ],
          }
        : {}),
    }));
    return Buffer.from(JSON.stringify({ cells: cellList, nbformat: 4, nbformat_minor: 5 }));
  }

  test("cells without their outputs", () => {
    const texts = notebookCells(
      notebook([
        ["markdown", "# Class balance"],
        ["code", "counts = df.label.value_counts()"],
        ["code", ""],
        ["raw", "notes"],
      ]),
    );
    assert.equal(texts.length, 4);
    assert.ok(!texts.join("").includes("AAAA")); // the picture an output holds is never read
    const pieces = cells(texts, 1800);
    assert.equal(pieces.length, 1);
    assert.deepEqual([pieces[0].first, pieces[0].last], [1, 4]); // the empty cell 3 is passed over, inside the range
    assert.ok(pieces[0].text.startsWith("# Class balance\n\ncounts"));
  });

  test("stretches hold whole cells", () => {
    const cell = "x = 1\n".repeat(100); // 600 characters
    const pieces = cells([cell, cell, cell, "y = 2\n".repeat(500)], 1800);
    assert.deepEqual(
      pieces.map((piece) => piece.first),
      [1, 3, 4, 4],
    );
    assert.deepEqual(
      pieces.map((piece) => piece.last),
      [2, 3, 4, 4],
    );
  });

  test("nbformat 3 keeps its cells in worksheets", () => {
    const old = { worksheets: [{ cells: [{ cell_type: "code", input: ["x = 1\n", "y = 2"] }, { source: "notes" }] }] };
    assert.deepEqual(notebookCells(Buffer.from(JSON.stringify(old))), ["x = 1\ny = 2", "notes"]);
  });

  test("odd cells read as empty, and a file that isn't a notebook says so", () => {
    const odd = { cells: [{ source: null, input: "x" }, { source: [1, "a"] }, { source: 7 }] };
    assert.deepEqual(notebookCells(Buffer.from(JSON.stringify(odd))), ["", "", ""]);
    assert.deepEqual(notebookCells(Buffer.from('{"cells": [1]}')), []);
    assert.equal(
      leftOut(() => notebookCells(Buffer.from("[1]"))),
      "unreadable: not a notebook",
    );
    assert.equal(
      leftOut(() => notebookCells(Buffer.from("{nope"))),
      "unreadable: not a notebook",
    );
  });
});

describe("what's left out once read", () => {
  test("generated code, private keys and minified bundles", () => {
    assert.equal(
      leftOut(() => check("// Code generated by protoc. DO NOT EDIT.\nx", true)),
      "made by a program (“DO NOT EDIT”)",
    );
    assert.equal(
      leftOut(() => check('KEY = """\n-----BEGIN RSA PRIVATE KEY-----\nabc\n"""', true)),
      "holds a private key",
    );
    const minified = "!function(){" + "var a=1;".repeat(1000) + "}();";
    assert.equal(
      leftOut(() => check(minified, true)),
      "minified (8016 characters a line)",
    );
    // A repo's notes may say "do not edit" anywhere, and run paragraphs on one line.
    assert.equal(
      leftOut(() => check("# Notes\n\nDO NOT EDIT the generated files by hand.\n", false)),
      null,
    );
    assert.equal(
      leftOut(() => check("word ".repeat(2000), false)),
      null,
    );
    assert.equal(
      leftOut(() => check("func a() {}\n", true)),
      null,
    );
  });

  test("reading a file: binary, keys, encodings, notebooks", () => {
    const options = DEFAULT_OPTIONS;
    assert.equal(
      leftOut(() => readCode(write("loose/bin.py", Buffer.from([0x61, 0, 0x62])), options)),
      "not text",
    );
    assert.equal(
      leftOut(() => readCode(write("loose/key.md", "-----BEGIN PRIVATE KEY-----"), options)),
      "holds a private key",
    );
    const latin = readCode(write("loose/latin.py", Buffer.from([0x63, 0x61, 0x66, 0xe9, 0x0a])), options);
    assert.equal(latin.pieces[0].text, "café");
    const bom = readCode(write("loose/bom.py", Buffer.from("﻿x = 1\n")), options);
    assert.equal(bom.pieces[0].text, "x = 1");
    const book = readCode(
      write("loose/nb.ipynb", JSON.stringify({ cells: [{ source: "a = 1" }, { source: "" }] })),
      options,
    );
    assert.deepEqual([book.cells, book.lines, book.pieces.length], [2, 1, 1]);
    const big = write("loose/big.ipynb", JSON.stringify({ cells: [{ source: "x".repeat(1_100_000) }] }));
    assert.equal(
      leftOut(() => readCode(big, options)),
      "cells over 1 MB",
    );
  });

  test("the testbed's code reads", (t) => {
    const file = resolve(".testbed/code/todo-web/src/hooks/useDebounce.ts");
    if (!existsSync(file)) return t.skip("no .testbed (it isn't checked in)");
    const code = readCode(file, DEFAULT_OPTIONS);
    assert.equal(code.repo, resolve(".testbed/code/todo-web"));
    assert.equal(code.title, "todo-web/src/hooks/useDebounce.ts");
    assert.ok(code.pieces.length >= 1 && code.lines > 0 && code.cells === null);
    const notebook = resolve(".testbed/code/ml-experiments/notebooks/explore.ipynb");
    if (existsSync(notebook)) assert.ok((readCode(notebook, DEFAULT_OPTIONS).cells ?? 0) > 0);
  });
});

describe("place", () => {
  test("in its repo, the repo's name first; outside one, its folder and its name", () => {
    mkdirSync(join(folder, "billing/.git"), { recursive: true });
    const file = write("billing/payments/retry.py", "pass\n");
    assert.deepEqual(place(file, "/nowhere"), { repo: join(folder, "billing"), title: "billing/payments/retry.py" });
    const loose = write("scripts/backup.sh", "echo\n");
    assert.deepEqual(place(loose, "/nowhere"), { repo: null, title: "scripts/backup.sh" });
    write("project/package.json", "{}");
    assert.deepEqual(place(write("project/src/a.ts", "x"), "/nowhere").title, "project/src/a.ts");
  });

  test("a crawl's map of repos is asked before the disk, and remembers", () => {
    const file = write("memo/a/b/c.py", "x = 1");
    const repos = new Map([[join(folder, "memo/a"), true]]); // not a repo on disk: the map is believed
    assert.deepEqual(place(file, "/nowhere", repos), { repo: join(folder, "memo/a"), title: "a/b/c.py" });
    assert.equal(repos.get(join(folder, "memo/a/b")), false); // looked at once, remembered
    assert.equal(readCode(file, DEFAULT_OPTIONS, "/nowhere", repos).repo, join(folder, "memo/a"));
    assert.equal(place(file, "/nowhere").repo, null);
  });

  test("the title is in Foundation's decomposed form, as DigUp embeds it; the repo stays as stored", () => {
    // swiftc: CodeExtractor.place(of: URL(fileURLWithPath: path).path) gives "re\u0301pertoire/fonction.py".
    mkdirSync(join(folder, "répertoire/.git"), { recursive: true });
    const file = write("répertoire/fonction.py", "pass\n");
    assert.deepEqual(place(file, "/nowhere"), {
      repo: join(folder, "répertoire"),
      title: "re\u0301pertoire/fonction.py",
    });
    assert.equal(place(write("größe/x/größe_berechnen.py", "x"), "/nowhere").title, "x/gro\u0308\u00dfe_berechnen.py");
  });

  test("the search stops below the home folder", () => {
    mkdirSync(join(folder, "home/.git"), { recursive: true });
    const file = write("home/Notes/plan.md", "x");
    assert.deepEqual(place(file, join(folder, "home")), { repo: null, title: "Notes/plan.md" });
  });
});

describe("languages", () => {
  test("from the extension or the name", () => {
    assert.equal(language("/a/App.swift"), "Swift");
    assert.equal(language("/a/x.PY"), "Python");
    assert.equal(language("/a/Makefile"), "Makefile");
    assert.equal(language("/a/Dockerfile.dev"), "Dockerfile.dev");
    assert.equal(language("/a/notes"), "Text");
    assert.equal(language("/a/data.parquet"), "PARQUET");
  });
});

describe("CodeLookup", () => {
  test("names from code", () => {
    assert.deepEqual(identifier("quantize_row_q8_0_ref"), ["quantize", "row", "q8", "0", "ref"]);
    assert.deepEqual(identifier("refreshAccessToken"), ["refreshaccesstoken"]);
    assert.deepEqual(identifier("DuplicateFinder"), ["duplicatefinder"]);
    assert.deepEqual(identifier("os.path.join"), ["os", "path", "join"]);
    assert.deepEqual(identifier("llama_sampler_top_k_impl()"), ["llama", "sampler", "top", "k", "impl"]);
    // Words anyone would say are searched as words, and by meaning.
    assert.equal(identifier("retry"), null);
    assert.equal(identifier("Renamer"), null);
    assert.equal(identifier("retry with backoff"), null);
    assert.equal(identifier("hamming distance"), null);
    assert.equal(phrase(["os", "path", "join"]), '"os path join"');
  });

  test("definitions over uses", () => {
    const defined = (name: string, text: string) => definition(name, text, 10)?.line ?? null;
    assert.equal(defined("retry_with_backoff", "x = retry_with_backoff(f)\n\ndef retry_with_backoff(attempts=5):"), 12);
    assert.equal(defined("isMPEGTransportStream", "    static func isMPEGTransportStream(_ url: URL) -> Bool {"), 10);
    assert.equal(
      defined(
        "refreshAccessToken",
        "  token = await refreshAccessToken();\nexport async function refreshAccessToken() {",
      ),
      11,
    );
    assert.equal(
      defined(
        "gguf_init_from_reader",
        "struct gguf_context * result = gguf_init_from_reader(gr, params);\n" +
          "static struct gguf_context * gguf_init_from_reader(const struct gguf_reader & gr, struct gguf_init_params p) {",
      ),
      11,
    );
    assert.equal(
      defined("llama_sampler_top_k_impl", "    llama_sampler_top_k_impl(cur_p, ctx->k);\n    return;"),
      null,
    );
    assert.equal(defined("SUStandardVersionComparator", "@implementation SUStandardVersionComparator"), 10);
    assert.equal(defined("Name", "func (s *Server) Name() string {"), 10);
    // A declaration counts less than a definition, more than a use.
    const header = "GGML_API void quantize_row_q8_0_ref(const float * x, block_q8_0 * y, int64_t k);";
    assert.equal(definition("quantize_row_q8_0_ref", header, 1)?.strength, 1);
    // Whole names only, whatever their case.
    assert.equal(defined("retry", "def retry_all():\n    pass\ndef RETRY():"), 12);
  });

  test("the line to open at", () => {
    const text = "import time\n\n\ndef retry_with_backoff(attempts=5):\n    pass\n";
    assert.equal(firstLine(["retry"], text, 40), 43);
    assert.equal(firstLine(["backoff"], "let a = 1\nfunc retryWithBackoff() {}", 1), 2);
    assert.equal(firstLine(["zebra"], text, 1), null);
    assert.equal(firstLine(["a"], text, 1), null); // one letter is no word
    // A definition with the words beats a docstring or a comment that has them first.
    const module = '"""Retrying calls to flaky services."""\n\nimport random\n\ndef retry_with_backoff(f):\n    pass\n';
    assert.equal(firstLine(["retry", "backoff"], module, 1), 5);
    assert.equal(firstLine(["calls"], module + "x = calls()\n", 1), 7);
  });

  test("names match as Foundation matches them: canonical equivalents, full case folding", () => {
    // Checked against DigUp's Swift on macOS 26.
    const nfd = (text: string) => text.normalize("NFD");
    assert.deepEqual(definition("caf\u00e9", nfd("def caf\u00e9(a):"), 1), { line: 1, strength: 2 });
    assert.deepEqual(definition(nfd("caf\u00e9"), "def caf\u00e9(a):", 1), { line: 1, strength: 2 });
    assert.equal(definition("\u00e5ngstr\u00f6m", nfd("class \u00c5ngstr\u00f6m:"), 1)?.line, 1);
    assert.equal(firstLine(["caf\u00e9"], nfd("x = 1\ndef caf\u00e9(a):"), 1), 2);
    assert.deepEqual(definition("STRASSE", "class Stra\u00dfe:", 1), { line: 1, strength: 2 }); // ß is ss
    assert.equal(definition("FILE", "func \ufb01le() {", 1)?.line, 1); // ﬁ is fi
  });

  test("a capital, for camelCase, is what Swift's isUppercase says", () => {
    // Swift: uppercase, or cased and unchanged by uppercasing (ĸ, ª, ʰ). Checked on every code point.
    assert.equal(firstLine(["\u0138b"], "z\u0138b", 1), 1);
    assert.equal(firstLine(["\u00aab"], "z\u00aab", 1), 1);
    assert.equal(firstLine(["ab"], "zab", 1), null);
    assert.equal(firstLine(["ab"], "zAb", 1), 1);
  });

  test("a stretch in one line", () => {
    assert.equal(
      summary("import os\n\n# Retry things\ndef retry_with_backoff(attempts=5):\n    pass"),
      "def retry_with_backoff(attempts=5):",
    );
    assert.equal(summary("// header\nlet total = items.reduce(0, +)\n"), "let total = items.reduce(0, +)");
    assert.equal(summary("// only a comment"), "// only a comment");
    assert.equal(summary(`x = "${"y".repeat(200)}"`), `x = "${"y".repeat(155)}…`);
    assert.equal(summary(""), "");
  });
});
