// The parity gate, opt-in (DIGUP_EVAL=1; it needs the testbed, the vendored llama.cpp and the model, and runs for about a
// minute): index DigUp's testbed as DigUp's baseline did, run its three evals with -n 10, and hold every tag to
// DigUp's numbers (docs/baseline/eval-*.txt) and the indexing to 1.5 times DigUp's time.
//
// The code folder is indexed from a copy outside this repo: the repo's .gitignore lists .testbed/, so DigUp's own crawl
// of .testbed/code now leaves two scripts out as "ignored by git" (DigUp did not when its baseline was made).

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const repo = resolve(import.meta.dirname, "..");
const testbed = join(repo, ".testbed");
const needs: Array<[string, string]> = [
  [testbed, "DigUp's eval testbed"],
  [join(repo, ".vendor/llama-b11624/llama-server"), "the vendored llama.cpp"],
  [join(homedir(), "Library/Application Support/DigUp/Models/mmproj-embeddinggemma-2-Q8_0.gguf"), "the model"],
  [join(repo, "assets/digup-helper"), "the Swift helper"],
];
const missing = needs.find(([path]) => !existsSync(path));
const skip =
  process.env.DIGUP_EVAL !== "1"
    ? "the eval runs with DIGUP_EVAL=1"
    : missing
      ? `${missing[1]} is missing (${missing[0]})`
      : false;

/** DigUp's times on this Mac (docs/baseline/index-*.log). */
const DIGUP_SECONDS = { main: 51.3, code: 8.3 };

interface Row {
  n: number;
  r1: number;
  r5: number;
  r10: number;
  mrr: number;
}

/** The tag table of `digup eval` output. */
function table(output: string): Map<string, Row> {
  const rows = new Map<string, Row>();
  const lines = output.split("\n");
  const start = lines.findIndex((line) => /^tag\s+n\s+R@1/.test(line));
  for (const line of lines.slice(start + 1)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length !== 6 || !/^\d+$/.test(parts[1])) continue;
    const [tag, n, r1, r5, r10, mrr] = parts;
    rows.set(tag, { n: Number(n), r1: Number(r1), r5: Number(r5), r10: Number(r10), mrr: Number(mrr) });
  }
  return rows;
}

function cli(args: string[], env: Record<string, string> = {}): { output: string; seconds: number } {
  const started = performance.now();
  const run = spawnSync("bash", [join(repo, "scripts/run-node.sh"), join(repo, "scripts/cli.ts"), ...args], {
    cwd: repo,
    env: { ...process.env, ...env },
    encoding: "utf8",
    maxBuffer: 64 << 20,
  });
  if (run.status !== 0) throw new Error(`cli ${args[0]} failed: ${run.stderr || run.stdout}`);
  return { output: run.stdout, seconds: (performance.now() - started) / 1000 };
}

describe("parity with DigUp on its testbed", { skip }, () => {
  let work = "";
  let index = "";
  const seconds = { main: 0, code: 0 };

  before(() => {
    work = realpathSync(mkdtempSync(join(tmpdir(), "dig-up-eval-")));
    index = join(work, "index");
    execFileSync("cp", ["-Rp", join(testbed, "code"), join(work, "code")]);
    seconds.main = cli(["index", join(testbed, "synthetic"), join(testbed, "traps"), "--index", index]).seconds;
    seconds.code = cli(["index", join(work, "code"), "--code", "--index", index]).seconds;
  });
  after(() => rmSync(work, { recursive: true, force: true }));

  it("indexes as DigUp did: the same files, states and segments", () => {
    const ours = cli(["status", "--index", index]).output.split("\n").slice(1, 9).join("\n");
    const digup = readFileSync(join(repo, "docs/baseline/status.txt"), "utf8").split("\n").slice(1, 9).join("\n");
    assert.equal(ours, digup);
  });

  it("indexes within 1.5 times DigUp's time", () => {
    assert.ok(seconds.main <= DIGUP_SECONDS.main * 1.5, `main index: ${seconds.main.toFixed(1)} s`);
    assert.ok(seconds.code <= DIGUP_SECONDS.code * 1.5, `code index: ${seconds.code.toFixed(1)} s`);
  });

  for (const name of ["synthetic", "multilingual", "code"]) {
    it(`finds what DigUp finds: ${name}`, () => {
      const base = name === "code" ? work : testbed;
      const ours = table(
        cli(["eval", join(repo, `test/fixtures/digup/evals/${name}.json`), "-n", "10", "--index", index], {
          DIGUP_TESTBED: base,
        }).output,
      );
      const digup = table(readFileSync(join(repo, `docs/baseline/eval-${name}.txt`), "utf8"));
      assert.ok(digup.size > 1, "DigUp's table");
      for (const [tag, theirs] of digup) {
        const row = ours.get(tag);
        assert.ok(row, `tag ${tag}`);
        assert.equal(row.n, theirs.n, `${tag} n`);
        assert.ok(row.r1 >= theirs.r1, `${tag} R@1 ${row.r1} < ${theirs.r1}`);
        assert.ok(row.r5 >= theirs.r5, `${tag} R@5 ${row.r5} < ${theirs.r5}`);
        assert.ok(row.mrr >= theirs.mrr, `${tag} MRR ${row.mrr} < ${theirs.mrr}`);
      }
    });
  }
});
