import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Entry } from "../src/api";
import { groupRecent } from "../src/recents";

test("groups matching stopped entries, normalizes tags, preserves newest and separates projects and activities", () => {
  const base: Entry = {
    id: 1,
    begin: "2026-10-19T08:00:00Z",
    end: "2026-10-19T09:00:00Z",
    duration: 3600,
    description: "Task",
    project: 1,
    activity: 2,
    tags: ["a", "b"],
  };
  const groups = groupRecent([
    base,
    {
      ...base,
      id: 2,
      begin: "2026-10-19T10:00:00Z",
      tags: [{ id: 1, name: "b" }, "a"],
    },
    { ...base, id: 3, project: 3 },
    { ...base, id: 4, activity: 4 },
    { ...base, id: 5, tags: ["different"] },
    { ...base, id: 6, end: null },
  ]);
  assert.equal(groups.length, 4);
  assert.equal(groups[0].count, 2);
  assert.equal(groups[0].entry.id, 2);
  assert.deepEqual(
    groups.slice(1).map((g) => g.count),
    [1, 1, 1],
  );
  assert.deepEqual(groupRecent([]), []);
});
