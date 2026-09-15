/**
 * The menu's owner sections: every owner you put in scope keeps its section,
 * even when nothing came back for it.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
require("./harness.cjs");
const { groupPullsByOwner } = require("../src/util.ts");

const pull = (id, owner) => ({ id, owner, title: id, repo: id, user: { login: "someone", avatarUrl: "" } });
const shape = groups => groups.map(g => [g.owner, g.pulls.map(p => p.id)]);

test("an organization in scope keeps its section when it has no pull requests", () => {
  const groups = groupPullsByOwner(
    ["vitoraguila", "awesome-lab", "Gravl-Inc"],
    [pull("flex-review#1", "vitoraguila"), pull("odyyy#417", "awesome-lab")],
  );
  assert.deepEqual(shape(groups), [
    ["vitoraguila", ["flex-review#1"]],
    ["awesome-lab", ["odyyy#417"]],
    ["Gravl-Inc", []],
  ]);
});

test("sections follow the order you configured the owners in", () => {
  const groups = groupPullsByOwner(["c-org", "a-org", "b-org"], [pull("x", "b-org")]);
  assert.deepEqual(
    groups.map(g => g.owner),
    ["c-org", "a-org", "b-org"],
  );
});

test("an owner outside the scope still gets a section rather than losing its pull request", () => {
  const groups = groupPullsByOwner(["acme"], [pull("x", "outsider")]);
  assert.deepEqual(shape(groups), [
    ["acme", []],
    ["outsider", ["x"]],
  ]);
});

test("owner casing from GitHub is matched against the configured spelling", () => {
  const groups = groupPullsByOwner(["Gravl-Inc"], [pull("x", "gravl-inc")]);
  assert.deepEqual(shape(groups), [["Gravl-Inc", ["x"]]], "one section, keeping the name you configured");
});

test("no scope at all falls back to grouping by whatever came back", () => {
  const groups = groupPullsByOwner([], [pull("x", "acme"), pull("y", "acme"), pull("z", "globex")]);
  assert.deepEqual(shape(groups), [
    ["acme", ["x", "y"]],
    ["globex", ["z"]],
  ]);
});

test("a pull request with no owner is labelled rather than dropped", () => {
  const groups = groupPullsByOwner([], [pull("x", "")]);
  assert.deepEqual(shape(groups), [["Unknown", ["x"]]]);
});

test("an empty owner in the scope list is skipped", () => {
  const groups = groupPullsByOwner(["", "acme"], []);
  assert.deepEqual(shape(groups), [["acme", []]]);
});

test("nothing in scope and nothing found makes no sections at all", () => {
  assert.deepEqual(groupPullsByOwner([], []), []);
});
