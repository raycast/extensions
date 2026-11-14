import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteGroup,
  formatGroup,
  getGroups,
  isInGroup,
  isRenameTaken,
  normalizeGroup,
  renameGroup,
} from "../src/lib/groups.ts";

const item = (color, group) => ({ date: "2026-10-08T00:00:00.000Z", color, group });

test("group names are trimmed and empty levels dropped", () => {
  assert.equal(normalizeGroup("  Work / Calendar  "), "Work/Calendar");
  assert.equal(normalizeGroup("/Work//Calendar/"), "Work/Calendar");
  assert.equal(normalizeGroup(" / "), "");
  assert.equal(formatGroup("Work/Calendar"), "Work / Calendar");
});

test("subgroups belong to their parent but similar names do not", () => {
  assert.equal(isInGroup("Work", "Work"), true);
  assert.equal(isInGroup("Work/Calendar", "Work"), true);
  assert.equal(isInGroup("Workshop", "Work"), false);
  assert.equal(isInGroup(undefined, "Work"), false);
});

test("groups are listed once each with subgroups after their parent", () => {
  const history = [
    item("#000", "Work2"),
    item("#111", "Work/Calendar"),
    item("#222", "Terminal"),
    item("#333", "Work"),
    item("#444", "Work/Calendar"),
    item("#555"),
  ];
  assert.deepEqual(getGroups(history), ["Terminal", "Work", "Work/Calendar", "Work2"]);
});

test("renaming a group moves its subgroups and leaves similar names alone", () => {
  const history = [item("#111", "Work"), item("#222", "Work/Calendar"), item("#333", "Workshop"), item("#444")];
  assert.deepEqual(
    renameGroup(history, "Work", "Jobs").map((entry) => entry.group),
    ["Jobs", "Jobs/Calendar", "Workshop", undefined],
  );
});

test("deleting a group ungroups its colors and subgroups but keeps the colors", () => {
  const history = [item("#111", "Work"), item("#222", "Work/Calendar"), item("#333", "Workshop")];
  const result = deleteGroup(history, "Work");
  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((entry) => entry.group),
    [undefined, undefined, "Workshop"],
  );
});

test("a rename is refused only when it would land on a group that already exists", () => {
  const groups = ["Brand", "Brand/Dark", "Calendar", "Calendar/Dark", "Work"];
  assert.equal(isRenameTaken(groups, "Calendar", "Brand"), true);
  assert.equal(isRenameTaken(groups, "Work", "Brand/Light"), false);
  assert.equal(isRenameTaken(groups, "Work", "Calendar/Dark"), true);
  assert.equal(isRenameTaken(groups, "Calendar", "Calendar/Old"), false);
  assert.equal(isRenameTaken(groups, "Work", "Jobs"), false);
});
