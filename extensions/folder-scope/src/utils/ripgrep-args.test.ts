import assert from "node:assert/strict";
import { test } from "node:test";
import type { SearchOptions } from "../types/search.ts";
import { buildRipgrepArgs } from "./ripgrep-args.ts";

const BASE: SearchOptions = {
  caseMode: "smart",
  searchMode: "text",
  wholeWord: false,
  multiline: false,
  invertMatch: false,
  maxDepth: null,
  includeHidden: false,
  followSymlinks: false,
  respectIgnoreFiles: true,
  includeBinary: false,
  searchFileNames: false,
  includedExtensions: [],
  excludedExtensions: [],
  excludedDirectories: [],
  includeGlobs: [],
  excludeGlobs: [],
  maxResults: 250,
  maxFileSizeBytes: 10 * 1024 * 1024,
  contextBefore: 0,
  contextAfter: 0,
};

test("protocol and config isolation always come first", () => {
  const args = buildRipgrepArgs("query", "/dir", BASE);
  assert.deepEqual(args.slice(0, 2), ["--json", "--no-config"]);
});

test("query is a single --regexp token; a leading dash cannot become a flag", () => {
  const args = buildRipgrepArgs("--version", "/dir", BASE);
  assert.ok(args.includes("--regexp=--version"));
  assert.equal(args.indexOf("--version"), -1);
});

test("search root is the only positional argument, after --", () => {
  const args = buildRipgrepArgs("q", "/My Dir/Ölçüm", BASE);
  const separator = args.indexOf("--");
  assert.ok(separator > 0);
  assert.deepEqual(args.slice(separator), ["--", "/My Dir/Ölçüm"]);
});

test("mode and case flags map correctly", () => {
  const text = buildRipgrepArgs("q", "/d", BASE);
  assert.ok(text.includes("--fixed-strings"));
  assert.ok(text.includes("--smart-case"));

  const regex = buildRipgrepArgs("q", "/d", {
    ...BASE,
    searchMode: "regex",
    caseMode: "insensitive",
    wholeWord: true,
    multiline: true,
    invertMatch: true,
  });
  assert.ok(!regex.includes("--fixed-strings"));
  assert.ok(regex.includes("--ignore-case"));
  assert.ok(regex.includes("--word-regexp"));
  assert.ok(regex.includes("--multiline"));
  assert.ok(regex.includes("--invert-match"));

  const sensitive = buildRipgrepArgs("q", "/d", { ...BASE, caseMode: "sensitive" });
  assert.ok(sensitive.includes("--case-sensitive"));
});

test("traversal, size, and context flags appear only when set", () => {
  const defaults = buildRipgrepArgs("q", "/d", BASE);
  assert.ok(!defaults.some((a) => a.startsWith("--max-depth")));
  assert.ok(!defaults.includes("--hidden"));
  assert.ok(!defaults.includes("--follow"));
  assert.ok(!defaults.includes("--no-ignore"));
  assert.ok(!defaults.includes("--text"));
  assert.ok(!defaults.some((a) => a.startsWith("--before-context")));
  assert.ok(defaults.includes(`--max-filesize=${10 * 1024 * 1024}`));

  const custom = buildRipgrepArgs("q", "/d", {
    ...BASE,
    maxDepth: 3,
    includeHidden: true,
    followSymlinks: true,
    respectIgnoreFiles: false,
    includeBinary: true,
    contextBefore: 2,
    contextAfter: 1,
  });
  assert.ok(custom.includes("--max-depth=3"));
  assert.ok(custom.includes("--hidden"));
  assert.ok(custom.includes("--follow"));
  assert.ok(custom.includes("--no-ignore"));
  assert.ok(custom.includes("--text"));
  assert.ok(custom.includes("--before-context=2"));
  assert.ok(custom.includes("--after-context=1"));
});

test("exclusion globs come after inclusion globs so they win", () => {
  const args = buildRipgrepArgs("q", "/d", {
    ...BASE,
    includedExtensions: ["ts"],
    includeGlobs: ["src/**"],
    excludedExtensions: ["log"],
    excludedDirectories: ["node_modules"],
    excludeGlobs: ["!vendor/**", "secret/**"],
  });
  const globs = args.filter((a) => a.startsWith("--glob="));
  assert.deepEqual(globs, [
    "--glob=*.ts",
    "--glob=src/**",
    "--glob=!*.log",
    "--glob=!**/node_modules/**",
    "--glob=!vendor/**",
    "--glob=!secret/**",
  ]);
});
