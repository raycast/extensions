import test from "node:test";
import assert from "node:assert/strict";
import { cardDirs, expandHome, parseCards, parseWorkspaces, prioritize, terminalArgs } from "./parse.ts";

test("expands a leading tilde only", () => {
  assert.equal(expandHome("~", "/Users/t"), "/Users/t");
  assert.equal(expandHome(" ~/Work ", "/Users/t"), "/Users/t/Work");
  assert.equal(expandHome("/a/~/b", "/Users/t"), "/a/~/b");
  assert.equal(expandHome("~other", "/Users/t"), "~other");
});

test("card directories are distinct, local, and ranked by card count", () => {
  const cards = parseCards(
    "1\t-\t~/a\tnone\t-\t1\n2\t-\t~/b\tnone\t-\t2\n3\t-\t~/b\tnone\t-\t3\n4\t-\t/srv\tnone\tuser@h\t4\n",
  );
  assert.deepEqual(cardDirs(cards, "/Users/t"), ["/Users/t/b", "/Users/t/a"]);
});

test("parses ift ls rows, remote and number", () => {
  const out = "id1\t-\t~/Work/a\tworking\t-\t4\nid2\tg1\t~/b\tnone\tuser@host\t12\n\n";
  assert.deepEqual(parseCards(out), [
    { id: "id1", cwd: "~/Work/a", state: "working", remote: undefined, number: 4 },
    { id: "id2", cwd: "~/b", state: "none", remote: "user@host", number: 12 },
  ]);
});

test("no cards is an empty list", () => {
  assert.deepEqual(parseCards(""), []);
});

test("the last-used workspace moves first, the rest keep their order", () => {
  const ws = parseWorkspaces("a\tone\t1\t*\nb\ttwo\t1\t-\nc\tthree\t1\t-\n");
  assert.deepEqual(
    prioritize(ws, "c").map((w) => w.id),
    ["c", "a", "b"],
  );
});

test("a stale or missing last id changes nothing", () => {
  const ws = parseWorkspaces("a\tone\t1\t*\nb\ttwo\t1\t-\n");
  assert.equal(prioritize(ws, "gone"), ws);
  assert.equal(prioritize(ws), ws);
});

test("parses tab separated rows and the active marker", () => {
  const out = "w1\tmain\t3\t*\nw2\tnotes\t0\t-\n";
  assert.deepEqual(parseWorkspaces(out), [
    { id: "w1", name: "main", cards: 3, active: true },
    { id: "w2", name: "notes", cards: 0, active: false },
  ]);
});

test("skips blank lines and keeps names with spaces", () => {
  assert.deepEqual(parseWorkspaces("\nw1\tmy work\t1\t-\n\n"), [
    { id: "w1", name: "my work", cards: 1, active: false },
  ]);
});

test("empty output is no workspaces", () => {
  assert.deepEqual(parseWorkspaces(""), []);
});

test("terminal args always end flags with --", () => {
  assert.deepEqual(terminalArgs(["/a", "/b"]), ["terminal", "--", "/a", "/b"]);
  assert.deepEqual(terminalArgs(["/a"], "w1"), ["terminal", "--workspace", "w1", "--", "/a"]);
});

test("an older ift gets no --", () => {
  assert.deepEqual(terminalArgs(["/a"], undefined, undefined, false), ["terminal", "/a"]);
});

test("name is sent only with a new workspace", () => {
  assert.deepEqual(terminalArgs(["/a"], "new", " demo "), [
    "terminal",
    "--workspace",
    "new",
    "--name",
    "demo",
    "--",
    "/a",
  ]);
  assert.deepEqual(terminalArgs(["/a"], "w1", "demo"), ["terminal", "--workspace", "w1", "--", "/a"]);
  assert.deepEqual(terminalArgs(["/a"], "new", "  "), ["terminal", "--workspace", "new", "--", "/a"]);
});
