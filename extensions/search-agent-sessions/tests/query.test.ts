import assert from "node:assert/strict";
import { test } from "node:test";
import { parseQuery } from "../src/lib/query";

test("bare words are lowercased and kept in order", () => {
  const q = parseQuery("Deploy CACHE miss");
  assert.deepEqual(q, {
    words: ["deploy", "cache", "miss"],
    dirs: [],
    unknownAgents: [],
  });
});

test("word order does not change what is parsed", () => {
  const a = parseQuery("alpha beta");
  const b = parseQuery("beta alpha");
  assert.deepEqual([...a.words].sort(), [...b.words].sort());
  assert.equal(a.words.length, b.words.length);
});

test("token order does not change filters", () => {
  const a = parseQuery("dir:Foo hello agent:CODEX");
  const b = parseQuery("agent:codex dir:foo hello");
  assert.deepEqual(a, b);
});

test("dir: is repeatable and case-insensitive", () => {
  const q = parseQuery("dir:Foo dir:BAR DIR:baz");
  assert.deepEqual(q.dirs, ["foo", "bar", "baz"]);
  assert.deepEqual(q.words, []);
});

test("agent: accepts only claude and codex", () => {
  assert.equal(parseQuery("agent:claude").agent, "claude");
  assert.equal(parseQuery("agent:codex").agent, "codex");
  assert.equal(parseQuery("agent:CLAUDE").agent, "claude");
});

test("an invalid agent value becomes a search word, not a silent no-op", () => {
  const q = parseQuery("agent:gpt hello");
  assert.equal(q.agent, undefined);
  assert.deepEqual(q.words, ["agent:gpt", "hello"]);
});

test("a later valid agent does not resurrect an invalid one", () => {
  assert.equal(parseQuery("agent:gpt agent:codex").agent, "codex");
});

test("empty tokens from stray whitespace are skipped", () => {
  const q = parseQuery("   alpha \t\n  beta   ");
  assert.deepEqual(q.words, ["alpha", "beta"]);
});

test("an entirely blank query parses to nothing", () => {
  assert.deepEqual(parseQuery("   "), { words: [], dirs: [], unknownAgents: [] });
  assert.deepEqual(parseQuery(""), { words: [], dirs: [], unknownAgents: [] });
});

test("a bare dir: with no value adds no filter and no word", () => {
  const q = parseQuery("dir: hello");
  assert.deepEqual(q.dirs, []);
  assert.deepEqual(q.words, ["hello"]);
});

test("a bare agent: with no value adds no filter and no word", () => {
  const q = parseQuery("agent: hello");
  assert.equal(q.agent, undefined);
  assert.deepEqual(q.words, ["hello"]);
});

test("a mixed query splits into words, dirs and agent", () => {
  const q = parseQuery("Orbit dir:pixie Controls agent:codex dir:src");
  assert.deepEqual(q, {
    words: ["orbit", "controls"],
    dirs: ["pixie", "src"],
    unknownAgents: [],
    agent: "codex",
  });
});
