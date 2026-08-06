import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { chooseBackend } from "../src/lib/search";

/**
 * The two backends have to be interchangeable at the byte level, not merely
 * both "correct": every line they print is parsed downstream as
 * `key \t seq \t text`, so a backend that prefixed a filename or a line number
 * would not fail — it would silently attribute every hit to the wrong session.
 * Nothing else in the suite would notice.
 *
 * So this runs the real binaries over a real file and compares their output.
 * Where ripgrep is not installed there is nothing to compare against, and the
 * comparison is skipped rather than faked.
 */
const RG = ["/opt/homebrew/bin/rg", "/usr/local/bin/rg", "/usr/bin/rg"].find(
  (p) => existsSync(p),
);

const RIPGREP = chooseBackend({ managed: RG ?? null, onPath: null });
const GREP = chooseBackend({ managed: null, onPath: null });

// A NUL, because it is the byte that makes a sweep abandon the corpus and
// report "binary file matches" unless both backends are told to read it as
// text — the one difference between them that would cost whole sessions.
const CORPUS = [
  "sess-a\t3\tthe retry backoff was wrong",
  "sess-b\t7\tRETRY in capitals, matched case-insensitively",
  "sess-c\t1\tretry after a NUL \0 byte, mid-corpus",
  "sess-d\t9\tbackoff alone, no other query word",
  "sess-e\t2\tneither word appears on this line",
  "sess-f\t4\ta literal a.b that must not be read as a pattern",
  // The discriminating line: `a.b` as a regex reaches this one too, so a
  // backend that lost -F matches two lines here rather than one. Without it
  // the literal test passes either way, since `.` also matches a real dot.
  "sess-g\t5\tan axb that only a pattern would reach",
].join("\n");

let dir: string;
let corpus: string;

before(() => {
  dir = mkdtempSync(join(tmpdir(), "backend-parity-"));
  corpus = join(dir, "corpus.txt");
  writeFileSync(corpus, CORPUS + "\n");
});

after(() => rmSync(dir, { recursive: true, force: true }));

/** One sweep, returned as raw stdout. Exit 1 means "no matches", not a failure. */
function sweep(
  backend: { bin: string; base: string[] },
  words: string[],
  file?: string,
  input?: string,
): string {
  const args = [...backend.base];
  for (const word of words) args.push("-e", word);
  if (file) args.push("--", file);
  try {
    return execFileSync(backend.bin, args, { encoding: "utf8", input });
  } catch (err) {
    const e = err as { status?: number; stdout?: string };
    if (e.status === 1) return e.stdout ?? "";
    throw err;
  }
}

test(
  "both backends print a matched corpus line identically",
  { skip: !RG },
  () => {
    const fromRg = sweep(RIPGREP, ["retry"], corpus);
    const fromGrep = sweep(GREP, ["retry"], corpus);
    assert.equal(fromGrep, fromRg);
    // Not a tautology of two empty strings: the fixture has three retry lines,
    // and each has to arrive whole, with its key and seq columns untouched.
    assert.equal(fromRg.trimEnd().split("\n").length, 3);
    assert.ok(fromRg.startsWith("sess-a\t3\t"));
  },
);

test(
  "both backends agree when the sweep is fed from stdin",
  { skip: !RG },
  () => {
    // How every stage after the first in the pass-1 chain is invoked: no file
    // operand, corpus arriving on stdin.
    const first = sweep(RIPGREP, ["retry"], corpus);
    assert.equal(
      sweep(GREP, ["backoff"], undefined, first),
      sweep(RIPGREP, ["backoff"], undefined, first),
    );
  },
);

test(
  "both backends agree on an OR sweep of several words",
  { skip: !RG },
  () => {
    // The partial pass, which repeats -e per word.
    assert.equal(
      sweep(GREP, ["retry", "backoff"], corpus),
      sweep(RIPGREP, ["retry", "backoff"], corpus),
    );
  },
);

test("a NUL in the corpus stops neither backend", { skip: !RG }, () => {
  // Without --text/-a this returns one "binary file matches" line instead of
  // the matches, which reads downstream as a corpus that abruptly ends.
  const fromGrep = sweep(GREP, ["retry"], corpus);
  assert.ok(fromGrep.includes("sess-c\t1\t"));
  assert.doesNotMatch(fromGrep, /binary file matches/i);
  assert.equal(fromGrep, sweep(RIPGREP, ["retry"], corpus));
});

test(
  "both backends read the query as a literal, not a pattern",
  { skip: !RG },
  () => {
    // `a.b` matches only the line spelling it. A backend that lost -F would also
    // match "a.b" against "axb" anywhere in the corpus.
    const fromGrep = sweep(GREP, ["a.b"], corpus);
    assert.equal(fromGrep.trimEnd().split("\n").length, 1);
    assert.ok(fromGrep.startsWith("sess-f\t4\t"));
    assert.equal(fromGrep, sweep(RIPGREP, ["a.b"], corpus));
  },
);

test("both backends report no matches the same way", { skip: !RG }, () => {
  // Exit 1 with empty stdout, which `search` treats as a normal result rather
  // than a fault — the two backends have to agree on that too.
  assert.equal(sweep(GREP, ["zzznotpresentzzz"], corpus), "");
  assert.equal(sweep(RIPGREP, ["zzznotpresentzzz"], corpus), "");
});
