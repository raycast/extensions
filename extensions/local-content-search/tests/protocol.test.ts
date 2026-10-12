import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  validateConfig,
  decodeHits,
  validateQuery,
  DEFAULT_CONFIG,
} from "../service/protocol";

// Reject broad or hidden roots before any background crawl can start.
test("folder configuration requires explicit safe folders", () => {
  for (const root of [
    "/",
    "/Users",
    "/System",
    "/Applications",
    "/tmp/.ssh",
    "relative",
  ]) {
    assert.throws(() => validateConfig({ ...DEFAULT_CONFIG, roots: [root] }));
  }
  assert.deepEqual(
    validateConfig({ ...DEFAULT_CONFIG, roots: ["/tmp/test docs"] }).roots,
    ["/tmp/test docs"],
  );
});

test("configuration bounds worker memory and folder count", () => {
  assert.throws(() =>
    validateConfig({ ...DEFAULT_CONFIG, memoryLimitMb: 100000 }),
  );
  assert.throws(() =>
    validateConfig({ ...DEFAULT_CONFIG, roots: Array(21).fill("/tmp/docs") }),
  );
  assert.throws(() => validateConfig({ ...DEFAULT_CONFIG, paused: "false" }));
  assert.throws(() =>
    validateConfig({ ...DEFAULT_CONFIG, excludedExtensions: ["--reindex"] }),
  );
  assert.deepEqual(validateConfig(DEFAULT_CONFIG), DEFAULT_CONFIG);
});

// Treat queries as data, including text that looks like native CLI flags.
test("queries preserve option-like text but enforce a token budget", () => {
  assert.equal(validateQuery("  --reindex  "), "--reindex");
  assert.throws(() => validateQuery(" "));
  assert.throws(() => validateQuery("a".repeat(2001)));
  assert.throws(() => validateQuery({ query: "hello" }));
});

test("native result decoder rejects malformed and unbounded output", () => {
  const hit = {
    path: "/tmp/example.pdf",
    kind: "pdf",
    segment: "page",
    score: 3,
    loc: 2,
    excerpt: "A lease",
  };
  assert.deepEqual(decodeHits(JSON.stringify([hit])), [hit]);
  for (const output of [
    "{}",
    "not json",
    '[{"path":1}]',
    JSON.stringify([{ ...hit, path: "relative" }]),
    JSON.stringify([{ ...hit, score: null }]),
  ]) {
    assert.throws(() => decodeHits(output));
  }
});
