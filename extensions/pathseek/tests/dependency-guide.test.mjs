import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  HOMEBREW_INSTALL_COMMAND,
  HOMEBREW_URL,
  getMissingBinary,
  missingBinaryMessage,
} from "../src/lib/dependency-guide.ts";

test("recognizes only actual missing fd and fzf failures", () => {
  assert.equal(getMissingBinary("Error: Cannot locate fd. Run 'brew install fd fzf'"), "fd");
  assert.equal(getMissingBinary("Cannot locate fzf. Run 'brew install fd fzf'"), "fzf");
  assert.equal(getMissingBinary("Executable is not accessible: /my/fzf"), null);
  assert.equal(getMissingBinary("Search failed on /Users/foo/fd"), null);
  assert.equal(getMissingBinary(undefined), null);
});

test("installation help uses trusted Homebrew and does not run an installer", () => {
  assert.equal(HOMEBREW_INSTALL_COMMAND, "brew install fd fzf");
  assert.equal(HOMEBREW_URL, "https://brew.sh/");
  assert.match(missingBinaryMessage("fzf"), /PathSeek cannot find fzf/);
  assert.match(missingBinaryMessage("fd"), /set the executable paths in PathSeek preferences/);
});

test("first-use guidance is explicit and cannot trigger background index builds", async () => {
  const search = await readFile(new URL("../src/search-files.tsx", import.meta.url), "utf8");
  const rebuild = await readFile(new URL("../src/rebuild-index.tsx", import.meta.url), "utf8");
  assert.match(search, /getMissingBinary\(loadError\)/);
  assert.match(search, /Copy fd\/fzf Install Command/);
  assert.match(rebuild, /getMissingBinary\(error\)/);
  assert.match(rebuild, /Copy fd\/fzf Install Command/);
  assert.doesNotMatch(search, /\brebuildIndex\s*\(|\bspawn\s*\(/);
  assert.doesNotMatch(rebuild.slice(0, rebuild.indexOf("async function buildIndex(")), /\brebuildIndex\s*\(/);
});
