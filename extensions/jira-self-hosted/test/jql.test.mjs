import assert from "node:assert/strict";
import test from "node:test";

import { withProjectFilter } from "../src/helpers/jql.ts";

test("filters recently updated issues by one project or all projects", () => {
  const jql = "updated >= -1w ORDER BY updated DESC";

  assert.equal(withProjectFilter(jql, undefined), jql);
  assert.equal(withProjectFilter(jql, "EXPERIENCE"), "updated >= -1w AND project = EXPERIENCE ORDER BY updated DESC");
});
